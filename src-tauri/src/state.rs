use rdkafka::{
    admin::AdminClient, client::DefaultClientContext, consumer::StreamConsumer,
    producer::FutureProducer, ClientConfig,
};
use tokio::sync::RwLock;

pub struct KafkaState {
    pub admin: RwLock<Option<AdminClient<DefaultClientContext>>>,
    pub consumer: RwLock<Option<StreamConsumer>>,
    pub producer: RwLock<Option<FutureProducer>>,
    pub common_config: RwLock<Option<ClientConfig>>,
}

pub fn create_empty_state() -> KafkaState {
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
