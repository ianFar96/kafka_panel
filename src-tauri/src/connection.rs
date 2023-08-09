use rdkafka::{ClientConfig, admin::AdminClient, client::DefaultClientContext, consumer::StreamConsumer, producer::FutureProducer};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct SaslConfig {
    mechanism: String,
    username: String,
    password: String,
}

pub struct Connections {
    pub common_config: ClientConfig,
    pub admin: AdminClient<DefaultClientContext>,
    pub consumer: StreamConsumer,
    pub producer: FutureProducer,
}

#[tauri::command]
pub async fn create_connections(
    brokers: Vec<String>,
    group_id: String,
    sasl: Option<SaslConfig>,
) -> Result<Connections, String> {
    let mut common_config = ClientConfig::new();
    common_config.set("bootstrap.servers", &brokers.join(","));

    if let Some(sasl) = sasl {
        if sasl.mechanism != "PLAIN" {
            common_config.set("security.protocol", "SASL_SSL");
        }

        common_config
            .set("sasl.mechanism", sasl.mechanism)
            .set("sasl.username", sasl.username)
            .set("sasl.password", sasl.password);
    }

    let admin: AdminClient<_> = common_config
        .create()
        .map_err(|err| format!("Error creating admin connection: {}", err.to_string()))?;

    let consumer: StreamConsumer = common_config
        .set("group.id", group_id)
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .create()
        .map_err(|err| format!("Error creating consumer connection: {}", err.to_string()))?;

    let producer: FutureProducer = common_config
        .set("message.timeout.ms", "5000")
        .create()
        .map_err(|err| format!("Error creating producer connection: {}", err.to_string()))?;

    Ok(Connections {
        common_config,
        admin,
        consumer,
        producer,
    })
}
