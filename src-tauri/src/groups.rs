use byteorder::{BigEndian, ReadBytesExt};
use rdkafka::admin::{AdminClient, AdminOptions};
use rdkafka::client::DefaultClientContext;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::{ClientConfig, Offset, TopicPartitionList};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, Cursor};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::task::JoinHandle;

#[derive(Clone)]
pub struct KafkaGroup {
    pub name: String,
    pub members: Vec<KafkaGroupMember>,
}

#[derive(Clone)]
pub struct KafkaGroupMember {
    pub assignment: Vec<KafkaGroupMemberAssignment>,
}

#[derive(Clone)]
pub struct KafkaGroupMemberAssignment {
    pub topic: String,
    pub partitions: Vec<i32>,
}

#[derive(Serialize, Debug, PartialEq, Clone, Copy)]
pub enum GroupState {
    Consuming,
    Disconnected,
    Unconnected,
}

#[derive(Serialize, Debug)]
pub struct KafkaGroupResponse {
    name: String,
    state: GroupState,
    watermarks: (i64, i64),
}

pub async fn get_groups_from_topic(
    consumer: &StreamConsumer,
    common_config: ClientConfig,
    topic_name: String,
) -> Result<Vec<KafkaGroupResponse>, String> {
    let groups_result: HashMap<String, KafkaGroupResponse> = HashMap::new();
    let groups_result = Arc::new(Mutex::new(groups_result));

    let groups = get_groups_without_ours(consumer)?;

    let topic_name = Arc::new(topic_name);

    let mut handles = vec![];
    for group in groups {
        let groups_result = groups_result.clone();
        let mut common_config = common_config.clone();
        let topic_name = topic_name.clone();

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
                if offset.topic() != topic_name.to_string() {
                    continue;
                }
                if let Some(raw_offset) = offset.offset().to_raw() {
                    if raw_offset > 0 {
                        let (_, high) = consumer
                        .fetch_watermarks(
                            offset.topic(),
                            offset.partition(),
                            Duration::from_secs(5),
                        )
                        .map_err(|err| {
                            format!(
                                "Could not get watermarks for topic {} and partition {} from cluster: {}",
                                offset.topic(),
                                offset.partition(),
                                err.to_string()
                            )
                        })?;

                        // Add the entry (if there isn't any yet) with no watermark
                        let mut groups_result = groups_result.lock().unwrap();
                        let entry = groups_result.entry(group.clone().name).or_insert_with(|| {
                            KafkaGroupResponse {
                                name: group.clone().name,
                                state: GroupState::Disconnected,
                                watermarks: (0, 0),
                            }
                        });

                        // Sum the low and high watermark so we can have it for all partitions
                        entry.watermarks.0 += raw_offset;
                        entry.watermarks.1 += high;
                    }
                }
            }

            for member in group.clone().members {
                let assignment = member.assignment;
                for item in assignment {
                    if item.topic != topic_name.to_string() {
                        continue;
                    }

                    // Insert or update with state consuming
                    let mut groups_result = groups_result.lock().unwrap();
                    let entry =
                        groups_result
                            .entry(group.clone().name)
                            .or_insert(KafkaGroupResponse {
                                name: group.clone().name,
                                state: GroupState::Consuming,
                                watermarks: (0, 0),
                            });

                    entry.state = GroupState::Consuming;
                }
            }

            Ok(())
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap()?;
    }

    let groups_result = Arc::try_unwrap(groups_result)
        .unwrap()
        .into_inner()
        .unwrap();

    let mut groups_list: Vec<KafkaGroupResponse> = groups_result.into_values().collect();

    groups_list.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(groups_list)
}

pub async fn commit_latest_offsets(
    mut common_config: ClientConfig,
    group_name: String,
    topic_name: String,
) -> Result<(), String> {
    common_config.set("group.id", group_name);
    let consumer: StreamConsumer = common_config.create().map_err(|err| {
        format!(
            "Could not create consumer to fetch offsets: {}",
            err.to_string()
        )
    })?;

    let mut tpl = TopicPartitionList::new();

    let metadata = consumer
        .fetch_metadata(Some(&topic_name), Duration::from_secs(30))
        .map_err(|err| format!("Could not get metadata from cluster: {}", err.to_string()))?;

    for partition in metadata.topics().get(0).unwrap().partitions() {
        let (_, high) = consumer
            .fetch_watermarks(&topic_name, partition.id(), Duration::from_secs(5))
            .map_err(|err| {
                format!(
                    "Could not get watermarks for topic {} and partition {} from cluster: {}",
                    topic_name,
                    partition.id(),
                    err.to_string()
                )
            })?;

        tpl.add_partition_offset(&topic_name, partition.id(), Offset::Offset(high))
            .unwrap();
    }

    consumer
        .commit(&tpl, CommitMode::Sync)
        .map_err(|err| format!("Could not commit offsets: {}", err.to_string()))?;

    Ok(())
}

pub async fn seek_earliest_offsets(
    mut common_config: ClientConfig,
    group_name: String,
    topic_name: String,
) -> Result<(), String> {
    common_config.set("group.id", group_name);
    let consumer: StreamConsumer = common_config.create().map_err(|err| {
        format!(
            "Could not create consumer to fetch offsets: {}",
            err.to_string()
        )
    })?;

    let mut tpl = TopicPartitionList::new();

    let metadata = consumer
        .fetch_metadata(Some(&topic_name), Duration::from_secs(30))
        .map_err(|err| format!("Could not get metadata from cluster: {}", err.to_string()))?;

    for partition in metadata.topics().get(0).unwrap().partitions() {
        tpl.add_partition_offset(&topic_name, partition.id(), Offset::Offset(0))
            .unwrap();
    }

    consumer
        .commit(&tpl, CommitMode::Sync)
        .map_err(|err| format!("Could not commit offsets: {}", err.to_string()))?;

    Ok(())
}

pub async fn delete_group(
    admin: &AdminClient<DefaultClientContext>,
    group_name: String,
) -> Result<(), String> {
    let opts = AdminOptions::new().request_timeout(Some(Duration::from_secs(10)));
    admin
        .delete_groups(&[&group_name], &opts)
        .await
        .map_err(|err| format!("Error deleting consumer group: {}", err.to_string()))?;
    Ok(())
}

pub fn get_groups_without_ours(consumer: &StreamConsumer) -> Result<Vec<KafkaGroup>, String> {
    let group_list = consumer
        .fetch_group_list(None, Duration::from_secs(5))
        .map_err(|err| {
            format!(
                "Could not retrieve consumer information from cluster: {}",
                err.to_string()
            )
        })?;

    let mut groups_without_ours = vec![];
    for group in group_list.groups() {
        if group.name().ends_with("kafka-panel") {
            continue;
        }

        let mut members = vec![];
        for member in group.members() {
            members.push({
                KafkaGroupMember {
                    assignment: parse_assignment(member.assignment().unwrap_or(&[])).map_err(
                        |err| {
                            format!(
                                "Could not parse member assignment for group {}; {}",
                                group.name(),
                                err.to_string()
                            )
                        },
                    )?,
                }
            });
        }

        groups_without_ours.push(KafkaGroup {
            name: group.name().to_string(),
            members,
        });
    }

    Ok(groups_without_ours)
}

// https://github.com/fede1024/rust-rdkafka/pull/184/files
// TODO: check if range consumer group protocol is supported, tested with round robin
fn parse_assignment(assignment: &[u8]) -> Result<Vec<KafkaGroupMemberAssignment>, String> {
    let mut cursor = Cursor::new(assignment);

    // Version
    let _version = cursor
        .read_i16::<BigEndian>()
        .map_err(|err| format!("Could not retrieve version: {}", err.to_string()))?;

    // Whole assignment length
    let assign_len = cursor
        .read_i32::<BigEndian>()
        .map_err(|err| format!("Could not retrieve assignment length: {}", err.to_string()))?;

    // Acc for topic and partitions
    let mut assigns = Vec::with_capacity(assign_len as usize);
    for _ in 0..assign_len {
        // Get topic name
        let topic = read_str_from_assignment(&mut cursor)?.to_string();

        // Partition definition length
        let partition_len = cursor
            .read_i32::<BigEndian>()
            .map_err(|err| format!("Could not retrieve partition length: {}", err.to_string()))?;

        // Get partitions
        let mut partitions = Vec::with_capacity(partition_len as usize);
        for _ in 0..partition_len {
            let partition = cursor
                .read_i32::<BigEndian>()
                .map_err(|err| format!("Could not retrieve partition: {}", err.to_string()))?;
            partitions.push(partition);
        }

        // Push new KafkaGroupMemberAssignment
        assigns.push(KafkaGroupMemberAssignment { topic, partitions })
    }

    Ok(assigns)
}

fn read_str_from_assignment(rdr: &mut Cursor<&[u8]>) -> Result<String, String> {
    let len = (rdr.read_i16::<BigEndian>())
        .map_err(|err| format!("Could not read string from assingment: {}", err.to_string()))?
        as usize;
    let pos = rdr.position() as usize;
    let str = String::from_utf8((&rdr.get_ref()[pos..(pos + len)]).to_vec())
        .map_err(|err| format!("Conversion to UT8 error: {}", err.to_string()))?;
    rdr.consume(len);
    Ok(str)
}

pub fn get_group_offsets(consumer: &StreamConsumer) -> Result<TopicPartitionList, String> {
    let metadata = consumer
        .fetch_metadata(None, Duration::from_secs(30))
        .map_err(|err| format!("Could not get metadata from cluster: {}", err.to_string()))?;

    let mut tpl = TopicPartitionList::new();
    for topic in metadata.topics() {
        for partition in topic.partitions() {
            tpl.add_partition(&topic.name(), partition.id());
        }
    }

    let offsets = consumer
        .committed_offsets(tpl, Duration::from_secs(30))
        .map_err(|err| {
            format!(
                "Could not get committed offsets from cluster: {}",
                err.to_string()
            )
        })?;

    Ok(offsets)
}
