use std::{
    fs::{create_dir_all, File},
    path::Path,
};

use log::LevelFilter;
use serde::Deserialize;
use simplelog::{CombinedLogger, ConfigBuilder, WriteLogger};

use crate::{get_app_dir, get_app_dir_with_env};

#[derive(Deserialize, Debug)]
pub struct Extras {
    pub kafka_service_id: Option<String>,
}

pub fn init_log() -> Result<(), String> {
    let app_dir_with_env = get_app_dir_with_env()?;
    let mut logs_dir_with_env = format!("{}/logs", app_dir_with_env);

    // Retrocompatibility
    if !Path::new(&app_dir_with_env).is_dir() {
        let app_dir = get_app_dir()?;
        let config_dir = format!("{}/logs", app_dir);
        if Path::new(&config_dir).is_dir() {
            logs_dir_with_env = config_dir;
        }
    }

    let lifecycle_config = ConfigBuilder::new()
        .add_filter_allow("kafka_panel".to_string())
        .build();

    let deps_config = ConfigBuilder::new()
        .add_filter_ignore("kafka_panel".to_string())
        .build();

    if !Path::new(&logs_dir_with_env).is_dir() {
        create_dir_all(&logs_dir_with_env).map_err(|err| {
            format!(
                "Unexpected error, could not create logs directory in $HOME/.kafka_panel; err: {}",
                err.to_string()
            )
        })?;
    }

    CombinedLogger::init(vec![
        WriteLogger::new(
            LevelFilter::Trace,
            lifecycle_config,
            File::create(format!("{}/lifecycle.log", logs_dir_with_env)).unwrap(),
        ),
        WriteLogger::new(
            LevelFilter::Warn,
            deps_config,
            File::create(format!("{}/dependencies.log", logs_dir_with_env)).unwrap(),
        ),
    ])
    .map_err(|err| {
        format!(
            "Unexpected error while creating logger instance: {}",
            err.to_string()
        )
    })?;

    Ok(())
}

#[tauri::command]
pub fn append_log(message: &str, level: &str, extras: Option<Extras>) {
    match level {
        "trace" => log::trace!("{}; extras: {:?}", message, extras),
        "debug" => log::debug!("{}; extras: {:?}", message, extras),
        "warn" => log::warn!("{}; extras: {:?}", message, extras),
        "error" => log::error!("{}; extras: {:?}", message, extras),
        _ => log::info!("{}; extras: {:?}", message, extras),
    };
}
