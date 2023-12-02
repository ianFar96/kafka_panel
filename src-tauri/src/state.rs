use std::{fs::create_dir_all, io::ErrorKind, path::Path};

use jfs::{Config, Store};
use rdkafka::{
    admin::AdminClient, client::DefaultClientContext, consumer::StreamConsumer,
    producer::FutureProducer, ClientConfig,
};
use serde_json::{json, Value};
use tauri::api::path::home_dir;
use tokio::sync::RwLock;

pub struct KafkaState {
    pub common_config: RwLock<Option<ClientConfig>>,
    pub admin: RwLock<Option<AdminClient<DefaultClientContext>>>,
    pub consumer: RwLock<Option<StreamConsumer>>,
    pub producer: RwLock<Option<FutureProducer>>,
}

pub fn init_kafka() -> KafkaState {
    let admin = RwLock::new(None);
    let consumer = RwLock::new(None);
    let producer = RwLock::new(None);
    let common_config = RwLock::new(None);

    KafkaState {
        admin,
        consumer,
        producer,
        common_config,
    }
}

pub struct StorageState {
    pub settings: Store,
    pub messages: Store,
}

pub fn get_app_dir() -> Result<String, String> {
    let home_dir = match home_dir() {
        None => Err("Could not determine your home path with https://docs.rs/dirs/latest/dirs/fn.home_dir.html# function"),
        Some(dir) => Ok(dir)
    }?;

    Ok(format!("{}/.kafka_panel", home_dir.to_string_lossy()))
}

pub fn init_storage() -> Result<StorageState, String> {
    #[allow(unused_mut)]
    let app_folder = get_app_dir()?;
    let mut config_folder = format!("{}/config", app_folder);

    // Retrocompatibility
    if !Path::new(&config_folder).is_dir() && Path::new(&app_folder).is_dir() {
        config_folder = app_folder;
    }

    // Get settings from /dev folder in case of running in development
    #[cfg(dev)]
    {
        config_folder = format!("{}/dev", config_folder);
    }

    if !Path::new(&config_folder).is_dir() {
        create_dir_all(&config_folder).map_err(|err| {
            format!(
                "Unexpected error, could not create local store directory ~/.kafka_panel; err: {}",
                err.to_string()
            )
        })?;
    }

    let mut store_config = Config::default();
    store_config.single = true;

    let settings = Store::new_with_cfg(format!("{}/settings.json", config_folder), store_config)
        .map_err(|err| {
            format!(
                "Unexpected error, could create storage file; err: {}",
                err.to_string()
            )
        })?;

    set_storage_default(&settings, "CONNECTIONS", &json!([]))?;
    set_storage_default(&settings, "MESSAGES", &json!(20))?;

    let messages = Store::new_with_cfg(format!("{}/messages.json", config_folder), store_config)
        .map_err(|err| {
            format!(
                "Unexpected error, could create storage file; err: {}",
                err.to_string()
            )
        })?;

    Ok(StorageState { settings, messages })
}

fn set_storage_default(store: &Store, key: &str, value: &Value) -> Result<(), String> {
    match store.get::<Value>(key) {
        Ok(_) => {}
        Err(err) if err.kind() == ErrorKind::NotFound => {
            store.save_with_id::<Value>(value, key).map_err(|err| {
                format!(
                    "Unexpected error while initializing the in store for {}; err {}",
                    key,
                    err.to_string(),
                )
            })?;
        }
        Err(err) => Err(format!(
            "Unexpected error while initializing the in store for {}; err {}",
            key,
            err.to_string(),
        ))?,
    }

    Ok(())
}
