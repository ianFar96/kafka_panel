use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::{BorrowedMessage, Header, Headers, OwnedHeaders};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use rdkafka::{Message, Offset, TopicPartitionList};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::thread;
use tauri::Window;
use tokio::time::Duration;

#[derive(Serialize, Clone)]
pub struct KafkaMessageResponse {
    headers: Option<HashMap<String, Option<String>>>,
    value: Option<String>,
    key: String,
    offset: i64,
    partition: i32,
    timestamp: i64,
}

pub async fn listen_messages(
    window: Window,
    consumer: &StreamConsumer,
    topic: String,
    messages_number: i64,
    id: String,
) -> Result<(), String> {
    // Manually fetch metadata and assign partition so we don't fetch using our consumer group
    let metadata = consumer
        .fetch_metadata(Some(&topic), Duration::from_secs(30))
        .map_err(|err| {
            format!(
                "Could not fetch topic metadada for topic: {}\n\nError: {}",
                topic,
                err.to_string()
            )
        })?;
    let mut tpl = TopicPartitionList::new();
    for partition in metadata.topics().get(0).unwrap().partitions() {
        tpl.add_partition(&topic, partition.id());
    }
    consumer.assign(&tpl).map_err(|err| {
        format!(
            "Could not assign topic partition for topic: {}\n\nError: {}",
            topic,
            err.to_string()
        )
    })?;

    // Seek the latest watermark minus messages number to get only the last messages
    for partition in metadata.topics().get(0).unwrap().partitions() {
        let (_, high) = consumer
            .fetch_watermarks(&topic, partition.id(), Duration::from_secs(30))
            .map_err(|err| {
                format!(
                    "Could not seek partition offset in topic: {}, partition: {}\n\nError: {}",
                    topic,
                    partition.id(),
                    err.to_string()
                )
            })?;

        let seek_start = high - messages_number;
        let offset_start = if seek_start > 0 {
            Offset::Offset(seek_start)
        } else {
            Offset::Beginning
        };
        
        // Workaround system for the Erroneus state error
        let mut success = false;
        let mut attempts = 0;
        while !success {
            success = consumer.seek(&topic, partition.id(), offset_start, Duration::from_secs(30))
                .map(|_| true)
                .or_else(|error| {
                    if error.to_string() == "Seek error: Local: Erroneous state" && attempts < 5 {
                        return Ok(false);
                    }
    
                    Err(error)
                })
                .map_err(|err| {
                    format!(
                        "Could not seek partition offset in topic: {}, partition: {}, offset: {:?}\n\nError: {}",
                        topic,
                        partition.id(),
                        offset_start,
                        err.to_string()
                    )
                })?;

            attempts += 1;
            thread::sleep(Duration::from_millis(100));
        }
    }

    let keep_listening = Arc::new(RwLock::new(true));
    let keep_listening_clone = keep_listening.clone();
    window.once(format!("offMessage-{}", id), move |_| {
        *keep_listening_clone.write().unwrap() = false;
    });

    while *keep_listening.read().unwrap() {
        let timeout = Duration::from_secs(3);
        let message = match tokio::time::timeout(timeout, consumer.recv()).await {
            Ok(Ok(message)) => Ok(Some(message)),
            Ok(Err(err)) => Err(err.to_string()),
            Err(_) => Ok(None),
        }?;

        match message {
            Some(message) => {
                let message_result = process_message(&message).map_err(|err| {
                    format!(
                        "Could not process message for topic: {}, partition: {}, offset: {}\n\nError: {}",
                        message.topic(),
                        message.partition(),
                        message.offset(),
                        err
                    )
                })?;

                window
                    .emit(&format!("onMessage-{}", id), message_result)
                    .unwrap();
            }
            None => {}
        }
    }

    consumer.unsubscribe();

    Ok(())
}

fn process_message(message: &BorrowedMessage) -> Result<KafkaMessageResponse, String> {
    let headers = match message.headers() {
        Some(headers) => {
            let mut headers_map = HashMap::new();
            for header in headers.iter() {
                let value = match header.value {
                    Some(value) => {
                        let stringified_value =
                            std::str::from_utf8(value).map_err(|err| err.to_string())?;
                        Some(stringified_value.to_owned())
                    }
                    None => None,
                };
                headers_map.insert(header.key.to_string(), value);
            }
            Some(headers_map)
        }
        None => None,
    };

    let key = match message.key() {
        Some(key) => {
            let stringified_key = std::str::from_utf8(key).map_err(|err| err.to_string())?;
            stringified_key.to_owned()
        }
        None => return Err("Invalid message with no key".to_owned()),
    };

    let value = match message.payload() {
        Some(value) => {
            let stringified_value = std::str::from_utf8(value).map_err(|err| err.to_string())?;
            Some(stringified_value.to_owned())
        }
        None => None,
    };

    let timestamp_millis = message
        .timestamp()
        .to_millis()
        .ok_or("Couldn't convert timestamp to millis")?;

    Ok(KafkaMessageResponse {
        headers,
        key,
        value,
        offset: message.offset(),
        partition: message.partition(),
        timestamp: timestamp_millis,
    })
}

pub async fn send_message(
    producer: &FutureProducer,
    topic: String,
    headers: Option<HashMap<String, Option<&str>>>,
    key: String,
    value: Option<String>,
) -> Result<(), String> {
    let mut record = FutureRecord::to(&topic)
        .key(&key);

    #[allow(unused)]
    let mut extracted_value = "".to_owned();
    if value.is_some() {
        extracted_value = value.unwrap();
        record = record.payload(&extracted_value);
    }

    let mut headers_to_send = OwnedHeaders::new();
    match headers {
        Some(headers) => {
            for (header_key, header_value) in headers {
                headers_to_send = headers_to_send.insert(Header {
                    key: &header_key,
                    value: header_value,
                });
            }
        },
        None => {}
    }
    record = record.headers(headers_to_send);

    // FIXME: messages with same key sent by another system (kafkaJs, akhq) end up in different partitions
    producer
        .send(record, Timeout::Never)
        .await
        .map_err(|(err, _)| format!("Error while sending the message: {}", err.to_string()))?;

    Ok(())
}
