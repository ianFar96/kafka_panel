import { readonly, ref } from 'vue';
import { Connection } from '../types/connection';
import kafkaService from '../services/kafka';
import { defineStore } from 'pinia';

export const useConnectionStore = defineStore('connection', () => {
	const connection = ref<Connection>();

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
