use std::{fs::{File, create_dir_all}, path::Path};

use log::LevelFilter;
use simplelog::{CombinedLogger, ConfigBuilder, WriteLogger};

use crate::state;

pub fn init_log() -> Result<(), String> {
    let app_folder = state::get_app_dir()?;
    let logs_folder = format!("{}/logs", app_folder);

    let lifecycle_config = ConfigBuilder::new()
        .add_filter_allow("kafka_panel".to_string())
        .build();

    let deps_config = ConfigBuilder::new()
        .add_filter_ignore("kafka_panel".to_string())
        .build();

    if !Path::new(&logs_folder).is_dir() {
        create_dir_all(&logs_folder).map_err(|err| {
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
            File::create(format!("{}/logs/lifecycle.log", app_folder)).unwrap(),
        ),
        WriteLogger::new(
            LevelFilter::Warn,
            deps_config,
            File::create(format!("{}/logs/dependencies.log", app_folder)).unwrap(),
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

// TODO: try to separate librdkafka logs in another file
// TODO: add a page to visualize the logs, with search and all

#[tauri::command]
pub fn append_log(message: &str, level: &str) {
    match level {
        "trace" => log::trace!("{}", message),
        "debug" => log::debug!("{}", message),
        "warn" => log::warn!("{}", message),
        "error" => log::error!("{}", message),
        _ => log::info!("{}", message),
    };
}
