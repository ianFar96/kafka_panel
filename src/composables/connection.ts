import { readonly, ref } from 'vue';
import { Connection } from '../types/connection';
import { defineStore } from 'pinia';
import { KafkaService } from '../services/kafka';

export const useConnectionStore = defineStore('connection', () => {
	const connection = ref<Connection>();
	const kafkaService = new KafkaService();

	async function setConnection(newConnection: Connection) {
		const groupId = `${newConnection.groupPrefix ? `${newConnection.groupPrefix}.` : ''}kafka-panel`;
		await kafkaService.setConnection(newConnection.brokers, groupId, newConnection.auth);
		connection.value = newConnection;
	}

	return {
		connection: readonly(connection),
		// Override setConnection function so we can update our connection
		setConnection,
	};
});
