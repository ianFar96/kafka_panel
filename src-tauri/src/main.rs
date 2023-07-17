#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

fn main() {
    tauri::Builder::default()
        .manage(commands::create_empty_state())
        .invoke_handler(tauri::generate_handler![
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
            commands::get_messages_command,
            commands::send_message_command,
            commands::start_autosend_command,
            commands::stop_autosend_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
