#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use kafka_panel::logs;
use tauri::Manager;

mod commands;
mod state;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let storage = state::init_storage()?;
            app.manage(storage);
            
            let kafka = state::init_kafka();
            app.manage(kafka);

            logs::init_log()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Generic commands
            commands::is_dev,
            commands::append_log,
            // Generic kafka commands
            commands::set_connection_command,
            // Consumer Group commands
            commands::get_groups_from_topic_command,
            commands::reset_offsets_command,
            // Topic commands
            commands::get_topics_command,
            commands::get_topics_state_command,
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
