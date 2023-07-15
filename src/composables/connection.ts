import { readonly, ref } from 'vue';
import { Connection } from '../types/connection';
import kafkaService from '../services/kafka';

export function useConnection() {
	const connection = ref<Connection | undefined>();

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
}