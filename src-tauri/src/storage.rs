use std::{collections::BTreeMap, io::ErrorKind};

use jfs::Store;
use serde_json::Value;

pub fn save_in_store(store: &Store, value: Value, key: Option<&str>) -> Result<String, String> {
    let result = match key {
        None => store.save(&value),
        Some(key) => store.save_with_id(&value, key),
    };

    result.map_err(|err| {
        format!(
            "Unexpected error while saving in store; err {}",
            err.to_string()
        )
    })
}

pub fn get_from_store(store: &Store, key: &str) -> Result<Option<Value>, String> {
    match store.get::<Value>(&key) {
        Ok(value) => match value {
            Value::String(string_value) => {
                let parsed_value = string_value.parse().unwrap_or(Value::String(string_value));
                Ok(Some(parsed_value))
            }
            _ => Ok(Some(value)),
        },
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(format!(
            "Unexpected error while retrieving in store {}; err {}",
            key,
            err.to_string(),
        )),
    }
}

pub fn get_all_from_store(store: &Store) -> Result<BTreeMap<String, Value>, String> {
    store.all().map_err(|err| {
        format!(
            "Unexpected error while retrieving store content; err {}",
            err.to_string()
        )
    })
}

pub fn delete_from_store(store: &Store, key: &str) -> Result<(), String> {
    store.delete(key).map_err(|err| {
        format!(
            "Unexpected error while retrieving store content; err {}",
            err.to_string()
        )
    })
}
