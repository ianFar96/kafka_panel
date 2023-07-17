use futures::lock::Mutex;
use mockd::hipster;
use mockd::unique::uuid_v4;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::BorrowedMessage;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use rdkafka::{Message, Offset, TopicPartitionList};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::thread;
use std::time::Instant;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tokio::time::Duration;

pub type RunningAutosend = HashMap<String, bool>;

#[derive(Deserialize, Debug)]
pub struct AutosendOptions {
    duration: AutosendTime,
    interval: AutosendTime,
}

#[derive(Deserialize, Debug)]
pub struct AutosendTime {
    time_unit: TimeUnit,
    value: u64,
}

#[derive(Deserialize, Debug)]
pub enum TimeUnit {
    Hours,
    Minutes,
    Seconds,
    Miliseconds,
}

#[derive(Serialize, Clone)]
pub struct KafkaMessageResponse {
    value: String,
    key: String,
    offset: i64,
    partition: i32,
    timestamp: i64,
}

pub async fn get_messages(
    consumer: &StreamConsumer,
    topic: String,
    messages_number: i64,
) -> Result<Vec<KafkaMessageResponse>, String> {
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
        let (_, hight) = consumer
            .fetch_watermarks(&topic, partition.id(), Duration::from_secs(30))
            .map_err(|err| {
                format!(
                    "Could not seek partition offset in topic:{}, partition: {}\n\nError: {}",
                    topic,
                    partition.id(),
                    err.to_string()
                )
            })?;

        let seek_start = hight - messages_number;
        let offset_start = if seek_start > 0 {
            Offset::Offset(seek_start)
        } else {
            Offset::Beginning
        };
        consumer.seek(&topic, partition.id(), offset_start, Duration::from_secs(30)).map_err(|err| {
            format!(
                "Could not seek partition offset in topic:{}, partition: {}, offset: {}\n\nError: {}",
                partition.id(),
                topic,
                seek_start,
                err.to_string()
            )
        })?;
    }

    // We wait 3s initially so it has time to connect and all
    let mut timeout = Duration::from_secs(3);
    let mut message_results: Vec<KafkaMessageResponse> = vec![];
    loop {
        let message = match tokio::time::timeout(timeout, consumer.recv()).await {
            Ok(Ok(message)) => Ok(Some(message)),
            Ok(Err(err)) => Err(err.to_string()),
            Err(_) => Ok(None),
        }?;

        match message {
            Some(message) => {
                // Once we receive the first message we shorten the timeout so the user does not wait too much
                timeout = Duration::from_secs(1);

                let message_result = process_message(&message).map_err(|err| {
                    format!(
                        "Could not process message for topic: {}, partition: {}, offset: {}\n\nError: {}",
                        message.topic(),
                        message.partition(),
                        message.offset(),
                        err
                    )
                })?;

                message_results.push(message_result);
            }
            None => {
                break;
            }
        }
    }

    consumer.unsubscribe();

    // Reorder by timestamp
    message_results.sort_by(|a, b| {
        let timestamp_ord = b.timestamp.cmp(&a.timestamp);
        if std::cmp::Ordering::Equal != timestamp_ord {
            return timestamp_ord;
        }

        // If timestamp is equal, order by offset
        return b.offset.cmp(&a.offset);
    });

    // Get only the last [messages_number] messages
    // Since there can be more messages than the limit when there's more than 1 partition
    message_results.truncate(messages_number.try_into().unwrap());

    Ok(message_results)
}

fn process_message(message: &BorrowedMessage) -> Result<KafkaMessageResponse, String> {
    let key = match message.key() {
        Some(key) => std::str::from_utf8(key).map_err(|err| err.to_string())?,
        None => "null",
    }
    .to_string();

    let value = match message.payload() {
        Some(value) => std::str::from_utf8(value).map_err(|err| err.to_string())?,
        None => "null",
    }
    .to_string();

    let timestamp_millis = message
        .timestamp()
        .to_millis()
        .ok_or("Couldn't convert timestamp to millis")?;

    Ok(KafkaMessageResponse {
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
    key: String,
    value: String,
) -> Result<(), String> {
    let record = FutureRecord::to(&topic).key(&key).payload(&value);
    producer
        .send(record, Timeout::Never)
        .await
        .map_err(|(err, _)| format!("Error while sending the message: {}", err.to_string()))?;

    Ok(())
}

pub async fn start_autosend(
    pointer_running_autosend: &Arc<RwLock<RunningAutosend>>,
    producer: &FutureProducer,
    topic: String,
    key: Value,
    value: Value,
    options: AutosendOptions,
) -> Result<String, String> {
    // 1. replace key and value props for fake info
    // 2. send records taking into account the options (done)
    // 3. think of a way to stop the producer whenever is needed (done)

    let duration = match options.duration.time_unit {
        TimeUnit::Hours => Duration::from_secs(options.duration.value * 3600),
        TimeUnit::Minutes => Duration::from_secs(options.duration.value * 60),
        TimeUnit::Seconds => Duration::from_secs(options.duration.value),
        TimeUnit::Miliseconds => Duration::from_millis(options.duration.value),
    };

    let interval = match options.interval.time_unit {
        TimeUnit::Hours => Duration::from_secs(options.interval.value * 3600),
        TimeUnit::Minutes => Duration::from_secs(options.interval.value * 60),
        TimeUnit::Seconds => Duration::from_secs(options.interval.value),
        TimeUnit::Miliseconds => Duration::from_millis(options.interval.value),
    };

    let instant = Instant::now();

    // Keep track of the running autosend se we can stop them if needed
    let mut running_autosend = pointer_running_autosend.write().await;
    let id = uuid_v4();
    running_autosend.insert(id.clone(), true);

    let pointer_producer = Arc::new(Mutex::new(producer.to_owned()));
    let pointer_topic = Arc::new(Mutex::new(topic.to_string()));
    let pointer_key = Arc::new(Mutex::new(key));
    let pointer_value = Arc::new(Mutex::new(value));

    let mut handles = vec![];
    loop {
        if instant.elapsed() >= duration {
            break;
        }

        // Stop sending if requested
        let running_autosend = pointer_running_autosend.read().await;
        match running_autosend.get(&id) {
            None => {
                return Err(format!(
                    "Unexpected error, lost track of the current autosend {}, stopping...",
                    &id
                ))
            }
            Some(continue_running) => {
                if !*continue_running {
                    break;
                }
            }
        }

        let producer = pointer_producer.clone();

        let topic = pointer_topic.clone();
        let key = pointer_key.clone();
        let value = pointer_value.clone();

        let handle: JoinHandle<Result<(), String>> = tokio::spawn(async move {
            let producer = producer.lock().await;

            let topic = topic.lock().await;
            let key = &mut key.lock().await.clone();
            let value = &mut value.lock().await.clone();

            replace_with_fake(key)?;
            replace_with_fake(value)?;

            let stringified_key =
                serde_json::to_string(key).map_err(|err| format!("{}", err.to_string()))?;
            let stringified_value =
                serde_json::to_string(value).map_err(|err| format!("{}", err.to_string()))?;

            let record = FutureRecord::to(&topic)
                .key(&stringified_key)
                .payload(&stringified_value);

            match producer.send(record, Timeout::Never).await {
                Err(err) => Err(err.0.to_string()),
                Ok(_) => Ok(()),
            }
        });
        handles.push(handle);

        // Clean the ones completed
        handles = handles
            .into_iter()
            .filter(|handle| handle.is_finished())
            .collect();

        thread::sleep(interval);
    }

    for handle in handles {
        handle.abort();
    }

    Ok(id)
}

fn replace_with_fake(value: &mut Value) -> Result<(), String> {
    match value {
        Value::Object(obj) => {
            for (_, val) in obj {
                replace_with_fake(val)?;
            }
        }
        Value::Array(arr) => {
            for val in arr {
                replace_with_fake(val)?;
            }
        }
        Value::String(string) => {
            let re = Regex::new(r"\{\{(.*?)\}\}").unwrap();
            let captures = re.captures(string).unwrap();

            let mut replaced_string = string.clone();
            for capture in captures.iter() {
                if capture.is_some() {
                    let re = Regex::new(r"\{\{.*?\}\}").unwrap();
                    let faked_string = get_fake_from_type(capture.unwrap().as_str())?;
                    replaced_string = re.replace(string, faked_string.to_string()).to_string();
                }
            }

            *string = replaced_string;
        }
        _ => {}
    }

    Ok(())
}

fn get_fake_from_type(fake_type: &str) -> Result<String, String> {
    return match fake_type {
        "paragraph" => Ok(hipster::paragraph(3, 4, 40, " ".to_string())),
        "sentence" => Ok(hipster::sentence(12)),
        "word" => Ok(hipster::word()),
        unknown_type => Err(format!("Unkonwn fake type {}", unknown_type)),
    };
}
