#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Start the builder
    let mut builder = tauri::Builder::default()
        // 2. Register standard plugins directly on the builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_path::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    // 3. Keep your conditional logic for the Log plugin
    // This ensures logging only runs in debug mode, exactly as you had it.
    if cfg!(debug_assertions) {
        builder = builder.plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        );
    }

    // 4. Run the application
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}