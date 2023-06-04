import { createPinia, defineStore } from 'pinia';
import { ref } from 'vue';
import { Connection } from '../types/connection';
import { clone } from 'ramda';

export const useConnectionStore = defineStore('connection', () => {
	const connection = ref<Connection | undefined>();
	function set(newConnection: Connection) {
		connection.value = clone(newConnection);
	}
	return {connection, set};
});

const pinia = createPinia();
export default pinia;