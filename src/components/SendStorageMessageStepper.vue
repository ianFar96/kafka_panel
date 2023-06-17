
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { KafkaManager } from '../services/kafka';
import { Connection } from '../types/connection';
import { SendMessage } from '../types/message';
import { Topic } from '../types/topic';
import EditMessageDialog from './EditMessageDialog.vue';
import SelectTopicDialog from './SelectTopicDialog.vue';
import SetConnection from './SetConnection.vue';
import Dialog from './Dialog.vue';

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const selectedMessage = ref<SendMessage>();

const selectedTopic = ref<Topic>();

defineExpose({
	openDialog: (settingsConnections: Connection[], messageToSend: SendMessage) => {
		connections.value = settingsConnections;
		selectedMessage.value = messageToSend;
		setConnectionDialog.value?.openDialog();
	},
	closeDialog: () => {
		setConnectionDialog.value?.closeDialog();
		selectTopicDialog.value?.closeDialog();
		editMessageDialog.value?.closeDialog();
	},
});

const loader = useLoader();

const kafka = new KafkaManager();

const setConnectionDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const editMessageDialog = ref<InstanceType<typeof EditMessageDialog> | null>(null); // Template ref
const selectTopicDialog = ref<InstanceType<typeof SelectTopicDialog> | null>(null); // Template ref

const setConnection = async (connection: Connection) => {
	loader?.value?.show();
	try {
		await kafka.setConnection(
			connection.brokers,
			connection.auth,
			connection.groupPrefix
		);

		topics.value = await kafka.listTopics();
		selectTopicDialog.value?.openDialog();
	} catch (error) {
		await message(`Error setting the connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;
	editMessageDialog.value?.openDialog(selectedMessage.value!);
};

const sendMessage = async (key: string, value: string) => {
	loader?.value?.show();
	try {
		await kafka.sendMessage(selectedTopic.value!.name, key, value);
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
  <EditMessageDialog ref="editMessageDialog" :submit="sendMessage" :submit-button-text="'Send'" />
  <SelectTopicDialog ref="selectTopicDialog" :submit="selectTopic" :topics="topics" />

	<Dialog ref="setConnectionDialog" :title="'Choose Connection'">
		<SetConnection :connections="connections" :set-connection="setConnection" />
  </Dialog>
</template>