/**
 * This module is meant to be a safe abstraction on the tauri ecosystem and its internal state
 */
use jfs::Store;
use kafka_panel::{
    create_connections, create_topic, delete_from_store, delete_topic, get_all_from_store,
    get_from_store, get_groups_from_topic, get_topics, get_topics_state, listen_messages,
    reset_offsets, save_in_store, send_message, GroupState, KafkaGroupResponse, KafkaTopicResponse,
    SaslConfig,
};
use rdkafka::consumer::Consumer;
use serde_json::Value;
use std::{collections::{BTreeMap, HashMap}, time::Duration};
use tauri::{State, Window};

use crate::state::{KafkaState, StorageState};

#[tauri::command]
pub async fn set_connection_command<'a>(
    kafka: State<'a, KafkaState>,
    brokers: Vec<String>,
    group_id: String,
    sasl: Option<SaslConfig>,
) -> Result<(), String> {
    let connections = create_connections(brokers, group_id, sasl).await?;

    // Test the connection
    let _ = connections
        .consumer
        .fetch_group_list(None, Duration::from_secs(5))
        .map_err(|err| format!("Error while establishing connection: {}", err.to_string()))?;

    *kafka.common_config.write().await = Some(connections.common_config);
    *kafka.admin.write().await = Some(connections.admin);
    *kafka.consumer.write().await = Some(connections.consumer);
    *kafka.producer.write().await = Some(connections.producer);

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
pub async fn listen_messages_command<'a>(
    window: Window,
    state: State<'a, KafkaState>,
    topic: String,
    messages_number: i64,
) -> Result<(), String> {
    let binding = state.consumer.read().await;
    let consumer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    listen_messages(window, consumer, topic, messages_number).await
}

#[tauri::command]
pub async fn send_message_command<'a>(
    state: State<'a, KafkaState>,
    topic: String,
    headers: Option<HashMap<String, Value>>,
    key: Value,
    value: Value,
) -> Result<(), String> {
    let binding = state.producer.read().await;
    let producer = match *binding {
        None => return Err("Connection not set".into()),
        Some(ref x) => x,
    };

    send_message(producer, topic, headers, key, value).await
}

fn get_store<'a>(
    state: &'a State<'a, StorageState>,
    store_name: &str,
) -> Result<&'a Store, String> {
    let store = match store_name {
        "settings" => Ok(&state.settings),
        "messages" => Ok(&state.messages),
        &_ => Err(format!("Unexpected error, unknown store {}", store_name)),
    }?;

    Ok(store)
}

#[tauri::command]
pub fn save_in_store_command<'a>(
    state: State<'a, StorageState>,
    store_name: &str,
    key: Option<&str>,
    value: Value,
) -> Result<String, String> {
    let store = get_store(&state, store_name)?;
    save_in_store(store, value, key)
}

#[tauri::command]
pub fn get_from_store_command<'a>(
    state: State<'a, StorageState>,
    store_name: &str,
    key: &str,
) -> Result<Option<Value>, String> {
    let store = get_store(&state, store_name)?;
    get_from_store(store, key)
}

#[tauri::command]
pub fn get_all_from_store_command<'a>(
    state: State<'a, StorageState>,
    store_name: &str,
) -> Result<BTreeMap<String, Value>, String> {
    let store = get_store(&state, store_name)?;
    get_all_from_store(store)
}

#[tauri::command]
pub fn delete_from_store_command<'a>(
    state: State<'a, StorageState>,
    store_name: &str,
    key: &str,
) -> Result<(), String> {
    let store = get_store(&state, store_name)?;
    delete_from_store(store, key)
}
