#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use kafka_panel::{logs, init_storage, init_kafka};
use tauri::Manager;

mod commands;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let storage = init_storage()?;
            app.manage(storage);

            let kafka = init_kafka();
            app.manage(kafka);

            logs::init_log()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Generic commands
            commands::get_env_command,
            commands::append_log_command,
            // Generic kafka commands
            commands::set_connection_command,
            // Consumer Group commands
            commands::get_groups_from_topic_command,
            commands::commit_latest_offsets_command,
            commands::seek_earliest_offsets_command,
            commands::delete_group_command,
            // Topic commands
            commands::get_topics_command,
            commands::get_topics_state_command,
            commands::get_topics_watermark_command,
            commands::create_topic_command,
            commands::delete_topic_command,
            // Message commands
            commands::listen_messages_command,
            commands::send_message_command,
            // Store commands
            commands::save_in_store_command,
            commands::get_from_store_command,
            commands::get_all_from_store_command,
            commands::delete_from_store_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
