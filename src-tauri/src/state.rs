use std::{fs::create_dir_all, io::ErrorKind, path::Path};

use jfs::{Config, Store};
use rdkafka::{
    admin::AdminClient, client::DefaultClientContext, consumer::StreamConsumer,
    producer::FutureProducer, ClientConfig,
};
use serde_json::{json, Value};
use tauri::api::path::home_dir;
use tokio::sync::RwLock;

use crate::utils::{get_env, Environment};

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

#[allow(unused)]
pub fn get_app_dir_with_env() -> Result<String, String> {
    let app_dir = get_app_dir()?;
    match get_env() {
        Environment::Release => Ok(format!("{}/release", app_dir)),
        Environment::Dev => Ok(format!("{}/dev", app_dir)),
        Environment::E2E => Ok(format!("{}/e2e", app_dir))
    }
}

pub fn init_storage() -> Result<StorageState, String> {
    let app_dir_with_env = get_app_dir_with_env()?;
    let mut config_dir_with_env = format!("{}/config", app_dir_with_env);

    // Retrocompatibility
    if !Path::new(&app_dir_with_env).is_dir() {
        let app_dir = get_app_dir()?;
        let config_dir = format!("{}/config", app_dir);
        if Path::new(&config_dir).is_dir() {
            config_dir_with_env = config_dir;
        }
    }

    if !Path::new(&config_dir_with_env).is_dir() {
        create_dir_all(&config_dir_with_env).map_err(|err| {
            format!(
                "Unexpected error, could not create local store directory ~/.kafka_panel; err: {}",
                err.to_string()
            )
        })?;
    }

    let mut store_config = Config::default();
    store_config.single = true;

    let settings = Store::new_with_cfg(
        format!("{}/settings.json", config_dir_with_env),
        store_config,
    )
    .map_err(|err| {
        format!(
            "Unexpected error, could create storage file; err: {}",
            err.to_string()
        )
    })?;

    set_storage_default(&settings, "CONNECTIONS", &json!([]))?;
    set_storage_default(&settings, "MESSAGES", &json!(20))?;

    let messages = Store::new_with_cfg(
        format!("{}/messages.json", config_dir_with_env),
        store_config,
    )
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
