use rdkafka::consumer::{StreamConsumer, Consumer};
use rdkafka::message::BorrowedMessage;
use rdkafka::producer::{FutureRecord, FutureProducer};
use rdkafka::util::Timeout;
use rdkafka::Message;
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
    consumer.subscribe(&[&topic]).map_err(|err| {
        format!(
            "Could not subscribe to topic {}: {}",
            topic,
            err.to_string()
        )
    })?;

    // We wait 3s initially so it has time to connect and all
    let mut timeout = Duration::from_secs(3);
    let mut message_results: Vec<KafkaMessageResponse> = vec![];
    for _ in 0..messages_number {
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
                        "{err}; topic: {}, partition: {}, offset: {}",
                        message.topic(),
                        message.partition(),
                        message.offset()
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
    message_results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

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
