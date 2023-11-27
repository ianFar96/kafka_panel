use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::{BorrowedMessage, Header, Headers, OwnedHeaders};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use rdkafka::{Message, Offset, TopicPartitionList};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tauri::Window;
use tokio::time::Duration;

#[derive(Serialize, Clone)]
pub struct KafkaMessageResponse {
    headers: Option<HashMap<String, Option<Value>>>,
    value: Option<Value>,
    key: Option<Value>,
    offset: i64,
    partition: i32,
    timestamp: i64,
}

pub async fn listen_messages(
    window: Window,
    consumer: &StreamConsumer,
    topic: String,
    messages_number: i64,
    id: String
) -> Result<(), String> {
    // Manually fecth metadata and assign partition so we don't fetch using our consumer group
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
                    "Could not seek partition offset in topic:{}, partition: {}\n\nError: {}",
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
        consumer.seek(&topic, partition.id(), offset_start, Duration::from_secs(30)).map_err(|err| {
            format!(
                "Could not seek partition offset in topic:{}, partition: {}, offset: {}\n\nError: {}",
                topic,
                partition.id(),
                seek_start,
                err.to_string()
            )
        })?;
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

                window.emit(&format!("onMessage-{}", id), message_result).unwrap();
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
                        let parsed_value = serde_json::from_str::<Value>(stringified_value)
                            .unwrap_or(stringified_value.into());
                        Some(parsed_value)
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
            let parsed_key =
                serde_json::from_str::<Value>(stringified_key).unwrap_or(stringified_key.into());
            Some(parsed_key)
        }
        None => None,
    };

    let value = match message.payload() {
        Some(value) => {
            let stringified_value = std::str::from_utf8(value).map_err(|err| err.to_string())?;
            let parsed_value = serde_json::from_str::<Value>(stringified_value)
                .unwrap_or(stringified_value.into());
            Some(parsed_value)
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
    headers: Option<HashMap<String, Value>>,
    key: Value,
    value: Value,
) -> Result<(), String> {
    let stringified_key = serde_json::to_string(&key)
        .map_err(|err| format!("Error while stringifying message key: {}", err.to_string()))?;
    let stringified_value: String = serde_json::to_string(&value).map_err(|err| {
        format!(
            "Error while stringifying message value: {}",
            err.to_string()
        )
    })?;

    let mut record = FutureRecord::to(&topic)
        .key(&stringified_key)
        .payload(&stringified_value);

    if let Some(headers) = headers {
        let mut headers_to_send = OwnedHeaders::new();
        for (header_key, header_value) in headers {
            let stringified_header_value = match header_value {
                Value::String(string_header_value) => string_header_value,
                _ => serde_json::to_string(&header_value).map_err(|err| {
                    format!(
                        "Error while stringifying header's value: {}",
                        err.to_string()
                    )
                })?,
            };

            headers_to_send = headers_to_send.insert(Header {
                key: &header_key,
                value: Some(&stringified_header_value),
            });
        }

        record = record.headers(headers_to_send);
    }

    producer
        .send(record, Timeout::Never)
        .await
        .map_err(|(err, _)| format!("Error while sending the message: {}", err.to_string()))?;

    Ok(())
}
