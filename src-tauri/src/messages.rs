use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::BorrowedMessage;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use rdkafka::{Message, Offset, TopicPartitionList};
use serde::Serialize;
use serde_json::Value;
use tokio::time::Duration;

#[derive(Serialize, Clone)]
pub struct KafkaMessageResponse {
    value: PossibleJson,
    key: PossibleJson,
    offset: i64,
    partition: i32,
    timestamp: i64,
}

#[derive(Serialize, Clone)]
#[serde(untagged)]
pub enum PossibleJson {
    Value(Value),
    String(String),
}

pub async fn get_messages(
    consumer: &StreamConsumer,
    topic: String,
    messages_number: i64,
) -> Result<Vec<KafkaMessageResponse>, String> {
    // Manually fecth metadata and assign partition so we don't fetch using our consumer group
    let metadata = consumer
        .fetch_metadata(Some(&topic), Duration::from_secs(5))
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
            .fetch_watermarks(&topic, partition.id(), Duration::from_secs(5))
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
        consumer.seek(&topic, partition.id(), offset_start, Duration::from_secs(5)).map_err(|err| {
            format!(
                "Could not seek partition offset in topic:{}, partition: {}, offset: {}\n\nError: {}",
                seek_start,
                partition.id(),
                topic,
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
    let key_string = std::str::from_utf8(message.key().ok_or("Message without key found!")?)
        .map_err(|err| err.to_string())?;
    let key = serde_json::from_str(key_string)
        .map(|json| PossibleJson::Value(json))
        .unwrap_or(PossibleJson::String(key_string.to_string()));

    let value_string = match message.payload_view::<str>() {
        None => "",
        Some(result) => result.map_err(|err| {
            format!(
                "Error while deserializing message payload: {}",
                err.to_string()
            )
        })?,
    };
    let value = serde_json::from_str(value_string)
        .map(|json| PossibleJson::Value(json))
        .unwrap_or(PossibleJson::String(value_string.to_string()));

    let timestamp_millis = message
        .timestamp()
        .to_millis()
        .ok_or("Couldn't convert timestamp to millis")?;

    Ok(KafkaMessageResponse {
        key,
        offset: message.offset(),
        partition: message.partition(),
        timestamp: timestamp_millis,
        value,
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
