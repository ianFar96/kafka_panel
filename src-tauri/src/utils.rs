use std::env;
use serde::Serialize;

#[allow(dead_code)]
#[derive(Serialize)]
pub enum Environment {
    Dev,
    E2E,
    Release,
}

#[tauri::command]
#[allow(unreachable_code)]
pub fn get_env() -> Environment {
    #[cfg(dev)]
    {
        return Environment::Dev;
    }

    // https://webdriver.io/docs/api/environment
    match env::var("NODE_ENV") {
        Ok(env_var) => {
            if env_var == "test" {
                return Environment::E2E;
            }
        }
        Err(_) => {}
    }

    return Environment::Release;
}
