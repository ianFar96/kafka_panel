use std::{
    collections::HashMap,
    sync::{Arc, Mutex, RwLock},
    time::Duration,
};

use rdkafka::{
    admin::{AdminClient, AdminOptions, NewTopic, TopicReplication},
    client::DefaultClientContext,
    consumer::{Consumer, StreamConsumer},
    ClientConfig,
};
use serde::Serialize;
use tauri::Window;
use tokio::task::JoinHandle;

use crate::groups::{get_group_offsets, get_groups_without_ours, GroupState};

#[derive(Serialize, Debug, PartialEq)]
pub struct TopicResponse {
    pub name: String,
    pub partitions: usize,
}

struct TopicThread {
    name: String,
    partitions: Vec<i32>,
}

#[derive(Serialize, Debug, Clone)]
pub struct TopicWatermarkResponse {
    pub topic: String,
    pub watermark: usize,
}

pub async fn create_topic(
    admin: &AdminClient<DefaultClientContext>,
    topic_name: String,
    num_partitions: Option<i32>,
    replication_factor: Option<i32>,
) -> Result<(), String> {
    let replication = TopicReplication::Fixed(replication_factor.unwrap_or(1));
    let topic = NewTopic::new(&topic_name, num_partitions.unwrap_or(1), replication);
    let opts = AdminOptions::new().request_timeout(Some(Duration::from_secs(10)));

    admin
        .create_topics(vec![&topic], &opts)
        .await
        .map_err(|err| format!("Error creating topic: {}", err.to_string()))?;

    Ok(())
}

pub async fn delete_topic(
    admin: &AdminClient<DefaultClientContext>,
    topic_name: String,
) -> Result<(), String> {
    let opts = AdminOptions::new().request_timeout(Some(Duration::from_secs(10)));
    admin
        .delete_topics(&[&topic_name], &opts)
        .await
        .map_err(|err| format!("Error deleting topic: {}", err.to_string()))?;

    Ok(())
}

pub async fn get_topics(consumer: &StreamConsumer) -> Result<Vec<TopicResponse>, String> {
    let metadata = consumer
        .fetch_metadata(None, Duration::from_secs(30))
        .map_err(|err| format!("Could not get metadata from cluster: {}", err.to_string()))?;

    let mut topic_results: Vec<TopicResponse> = metadata
        .topics()
        .iter()
        .filter(|topic| topic.name() != "__consumer_offsets")
        .map(|topic| TopicResponse {
            name: topic.name().to_string(),
            partitions: topic.partitions().len(),
        })
        .collect();

    topic_results.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(topic_results)
}

// TODO: transform this to an event based system where every state is passed to the frontend asap
pub async fn get_topics_state(
    consumer: &StreamConsumer,
    common_config: &ClientConfig,
) -> Result<HashMap<String, GroupState>, String> {
    let mut topics_map: HashMap<String, GroupState> = HashMap::new();

    // Init all topics in the map having GroupState unconnected
    let metadata = consumer
        .fetch_metadata(None, Duration::from_secs(10))
        .map_err(|err| format!("Could not fetch topic metadata: {}", err.to_string()))?;
    for topic in metadata.topics() {
        topics_map.insert(topic.name().to_string(), GroupState::Unconnected);
    }

    let topics_map = Arc::new(Mutex::new(topics_map));

    let groups = get_groups_without_ours(consumer)?;

    let mut handles = vec![];
    for group in groups {
        let topics_map = topics_map.clone();
        let mut common_config = common_config.clone();

        let handle: JoinHandle<Result<(), String>> = tokio::spawn(async move {
            common_config.set("group.id", group.clone().name);
            let consumer: StreamConsumer = common_config.create().map_err(|err| {
                format!(
                    "Could not create consumer to fetch offsets: {}",
                    err.to_string()
                )
            })?;

            let offsets = get_group_offsets(&consumer)?;

            // With this we add all the groups that have some commited offset in the topic regardless the state
            for offset in offsets.elements() {
                if let Some(raw_offset) = offset.offset().to_raw() {
                    if raw_offset > 0 {
                        let mut topics_map = topics_map.lock().unwrap();
                        topics_map
                            .entry(offset.topic().to_string())
                            .and_modify(|e| {
                                if *e != GroupState::Consuming {
                                    *e = GroupState::Disconnected
                                }
                            });
                    }
                }
            }

            for member in group.members {
                let assignment = member.assignment;
                for item in assignment {
                    let mut topics_map = topics_map.lock().unwrap();
                    topics_map
                        .entry(item.topic.to_string())
                        .and_modify(|e| *e = GroupState::Consuming);
                }
            }

            Ok(())
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap()?;
    }

    let topics_map = Arc::try_unwrap(topics_map).unwrap().into_inner().unwrap();
    Ok(topics_map)
}

pub async fn get_topics_watermark(
    window: Window,
    consumer: StreamConsumer,
    id: String,
) -> Result<(), String> {
    let window = Arc::new(Mutex::new(window));
    let id = Arc::new(Mutex::new(id));
    let consumer = Arc::new(RwLock::new(consumer));

    let mut handles = vec![];

    let metadata = consumer
        .read()
        .unwrap()
        .fetch_metadata(None, Duration::from_secs(10))
        .map_err(|err| format!("Could not fetch topic metadata: {}", err.to_string()))?;

    let topics: Vec<TopicThread> = metadata
        .topics()
        .iter()
        .filter(|topic| topic.name() != "__consumer_offsets")
        .map(|topic| TopicThread {
            name: topic.name().to_string(),
            partitions: topic
                .partitions()
                .iter()
                .map(|partition| partition.id())
                .collect::<Vec<i32>>(),
        })
        .collect();

    for topic in topics {
        let window = window.clone();
        let id = id.clone();
        let consumer_clone = consumer.clone();

        let handle: JoinHandle<Result<(), String>> = tokio::spawn(async move {
            let mut high_watermark = 0;
            for partition in topic.partitions {
                let (_, high) = consumer_clone
                    .read()
                    .unwrap()
                    .fetch_watermarks(&topic.name, partition, Duration::from_secs(30))
                    .map_err(|err| {
                        format!("Could not fetch partition watermark: {}", err.to_string())
                    })?;
                high_watermark += high;
            }

            window
                .lock()
                .unwrap()
                .emit(
                    &format!("onWatermark-{}", id.lock().unwrap()),
                    TopicWatermarkResponse {
                        topic: topic.name,
                        watermark: high_watermark as usize,
                    },
                )
                .unwrap();

            Ok(())
        });

        handles.push(handle);
    }

    let keep_fetching = Arc::new(RwLock::new(true));
    let keep_fetching_clone = keep_fetching.clone();
    window
        .lock()
        .unwrap()
        .once(format!("offWatermark-{}", id.lock().unwrap()), move |_| {
            *keep_fetching_clone.write().unwrap() = false;
        });

    for handle in handles {
        if *keep_fetching.read().unwrap() {
            handle.await.unwrap()?;
        } else {
            handle.abort();
        }
    }

    Ok(())
}
