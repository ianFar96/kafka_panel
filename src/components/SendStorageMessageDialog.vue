
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { Ref, inject, ref } from 'vue';
import { KafkaManager } from '../services/kafka';
import { Connection } from '../types/connection';
import { SendMessage } from '../types/message';
import Loader from './Loader.vue';
import SendMessageDialog from './SendMessageDialog.vue';
import SetConnectionDialog from './SetConnectionDialog.vue';
import { Topic } from '../types/topic';
import SelectTopicDialog from './SelectTopicDialog.vue';

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
		sendMessageDialog.value?.closeDialog();
	},
});

const loader = inject<Ref<InstanceType<typeof Loader> | null>>('loader');

const kafka = new KafkaManager();

const setConnectionDialog = ref<InstanceType<typeof SetConnectionDialog> | null>(null); // Template ref
const sendMessageDialog = ref<InstanceType<typeof SendMessageDialog> | null>(null); // Template ref
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
	sendMessageDialog.value?.openDialog(selectedMessage.value!);
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
  <SendMessageDialog ref="sendMessageDialog" :sendMessage="sendMessage" />
  <SelectTopicDialog ref="selectTopicDialog" :selectTopic="selectTopic" :topics="topics" />
	<SetConnectionDialog ref="setConnectionDialog" :connections="connections" :closable="true"
		:set-connection="setConnection" />
</template>