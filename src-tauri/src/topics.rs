use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use rdkafka::{
    admin::{AdminClient, AdminOptions, NewTopic, TopicReplication},
    client::DefaultClientContext,
    consumer::{Consumer, StreamConsumer},
    ClientConfig,
};
use serde::Serialize;
use tokio::task::JoinHandle;

use crate::groups::{get_group_offsets, get_groups_without_ours, GroupState};

#[derive(Serialize, Debug, PartialEq)]
pub struct KafkaTopicResponse {
    pub name: String,
    pub partitions: usize,
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

pub async fn get_topics(consumer: &StreamConsumer) -> Result<Vec<KafkaTopicResponse>, String> {
    let metadata = consumer
        .fetch_metadata(None, Duration::from_secs(5))
        .map_err(|err| format!("Could not get metadata from cluster: {}", err.to_string()))?;

    let mut topic_results: Vec<KafkaTopicResponse> = metadata
        .topics()
        .iter()
        .filter(|topic| topic.name() != "__consumer_offsets")
        .map(|topic| KafkaTopicResponse {
            name: topic.name().to_string(),
            partitions: topic.partitions().len(),
        })
        .collect();

    topic_results.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(topic_results)
}

pub async fn get_topics_state(
    consumer: &StreamConsumer,
    common_config: ClientConfig,
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
