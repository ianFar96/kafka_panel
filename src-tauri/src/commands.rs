/**
 * This module is meant to be a safe abstraction on the tauri ecosystem and its internal state
 */
use kafka_panel::{
    create_topic, delete_topic, get_groups_from_topic, get_messages, get_topics, get_topics_state,
    reset_offsets, send_message, start_autosend, AutosendOptions, GroupState, KafkaGroupResponse,
    KafkaMessageResponse, KafkaTopicResponse, RunningAutosend,
};
use rdkafka::{
    admin::AdminClient, client::DefaultClientContext, consumer::StreamConsumer,
    producer::FutureProducer, ClientConfig,
};
use serde::Deserialize;
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};
use tauri::State;
use tokio::sync::RwLock;

#[derive(Deserialize, Debug)]
pub struct SaslConfig {
    mechanism: String,
    username: String,
    password: String,
}

pub struct KafkaState {
    admin: Arc<RwLock<Option<AdminClient<DefaultClientContext>>>>,
    consumer: Arc<RwLock<Option<StreamConsumer>>>,
    producer: Arc<RwLock<Option<FutureProducer>>>,
    common_config: Arc<RwLock<Option<ClientConfig>>>,
    running_autosend: Arc<RwLock<RunningAutosend>>,
}

pub fn create_empty_state() -> KafkaState {
    let admin = Arc::new(RwLock::new(None));
    let consumer = Arc::new(RwLock::new(None));
    let producer = Arc::new(RwLock::new(None));
    let common_config = Arc::new(RwLock::new(None));
    let running_autosend = Arc::new(RwLock::new(HashMap::new()));
    KafkaState {
        admin,
        consumer,
        producer,
        common_config,
        running_autosend,
    }
}

#[tauri::command]
pub async fn set_connection_command<'a>(
    kafka: State<'a, KafkaState>,
    brokers: Vec<String>,
    group_id: String,
    sasl: Option<SaslConfig>,
) -> Result<(), String> {
    let mut common_config = ClientConfig::new();
    common_config.set("bootstrap.servers", &brokers.join(","));

    if let Some(sasl) = sasl {
        if sasl.mechanism != "PLAIN" {
            common_config.set("security.protocol", "SASL_SSL");
        }

        common_config
            .set("sasl.mechanism", sasl.mechanism)
            .set("sasl.username", sasl.username)
            .set("sasl.password", sasl.password);
    }
    *kafka.common_config.write().await = Some(common_config.clone());

    let admin: AdminClient<_> = common_config
        .create()
        .map_err(|err| format!("Error creating admin connection: {}", err.to_string()))?;
    *kafka.admin.write().await = Some(admin);

    let consumer: StreamConsumer = common_config
        .set("group.id", group_id)
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .create()
        .map_err(|err| format!("Error creating consumer connection: {}", err.to_string()))?;
    *kafka.consumer.write().await = Some(consumer);

    let producer: FutureProducer = common_config
        .set("message.timeout.ms", "5000")
        .create()
        .map_err(|err| format!("Error creating producer connection: {}", err.to_string()))?;
    *kafka.producer.write().await = Some(producer);

    Ok(())
}

#[tauri::command]
pub async fn get_groups_from_topic_command<'a>(
    state: State<'a, KafkaState>,
    topic_name: String,
) -> Result<Vec<KafkaGroupResponse>, String> {
    let binding = state.consumer.read().await;
    let consumer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    let binding = state.common_config.read().await;
    let common_config = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x.clone(),
    };

    get_groups_from_topic(consumer, common_config, topic_name).await
}

#[tauri::command]
pub async fn reset_offsets_command<'a>(
    state: State<'a, KafkaState>,
    group_name: String,
    topic_name: String,
) -> Result<(), String> {
    let binding = state.common_config.read().await;
    let common_config = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x.clone(),
    };

    reset_offsets(common_config, group_name, topic_name).await
}

#[tauri::command]
pub async fn get_topics_command<'a>(
    state: State<'a, KafkaState>,
) -> Result<Vec<KafkaTopicResponse>, String> {
    let binding = state.consumer.read().await;
    let consumer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    get_topics(consumer).await
}

#[tauri::command]
pub async fn get_topics_state_command<'a>(
    state: State<'a, KafkaState>,
) -> Result<HashMap<String, GroupState>, String> {
    let binding = state.consumer.read().await;
    let consumer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    let binding = state.common_config.read().await;
    let common_config = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x.clone(),
    };

    get_topics_state(consumer, common_config).await
}

#[tauri::command]
pub async fn create_topic_command<'a>(
    state: State<'a, KafkaState>,
    topic_name: String,
    num_partitions: Option<i32>,
    replication_factor: Option<i32>,
) -> Result<(), String> {
    let binding = state.admin.read().await;
    let admin = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    create_topic(admin, topic_name, num_partitions, replication_factor).await
}

#[tauri::command]
pub async fn delete_topic_command<'a>(
    state: State<'a, KafkaState>,
    topic_name: String,
) -> Result<(), String> {
    let binding = state.admin.read().await;
    let admin = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    delete_topic(admin, topic_name).await
}

#[tauri::command]
pub async fn get_messages_command<'a>(
    state: State<'a, KafkaState>,
    topic: String,
    messages_number: i64,
) -> Result<Vec<KafkaMessageResponse>, String> {
    let binding = state.consumer.read().await;
    let consumer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    get_messages(consumer, topic, messages_number).await
}

#[tauri::command]
pub async fn send_message_command<'a>(
    state: State<'a, KafkaState>,
    topic: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let binding = state.producer.read().await;
    let producer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    send_message(producer, topic, key, value).await
}

#[tauri::command]
pub async fn start_autosend_command<'a>(
    state: State<'a, KafkaState>,
    topic: String,
    key: Value,
    value: Value,
    options: AutosendOptions,
) -> Result<String, String> {
    let binding = state.common_config.read().await;
    let common_config = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x.clone(),
    };

    // NOTE: we create a new producer so the autosend does not fail when connection is changed
    let producer = &common_config.create::<FutureProducer>().unwrap();

    let id = start_autosend(
        &state.running_autosend,
        producer,
        topic,
        key,
        value,
        options,
    )
    .await?;

    Ok(id)
}

#[tauri::command]
pub async fn stop_autosend_command<'a>(
    state: State<'a, KafkaState>,
    id: String,
) -> Result<(), String> {
    let mut running_autosend = state.running_autosend.write().await;
    if !running_autosend.contains_key(&id) {
        return Err(format!("Unexpected error, lost track of the autosend {}, will be stopped briefly", id));
    }

    running_autosend
        .entry(id)
        .and_modify(|autosend| *autosend = false);

    Ok(())
}
