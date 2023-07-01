
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { KafkaManager } from '../services/kafka';
import { Connection } from '../types/connection';
import { SendMessage } from '../types/message';
import { Topic } from '../types/topic';
import EditMessage from './EditMessage.vue';
import SelectTopic from './SelectTopic.vue';
import SelectConnection from './SelectConnection.vue';
import Dialog from './Dialog.vue';

type Steps = 'connection' | 'topic' | 'message'

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const selectedMessage = ref<SendMessage>();

const selectedTopic = ref<Topic>();

const step = ref<Steps>('connection');
const stepTitle = ref<string>('');

defineExpose({
	openDialog: (settingsConnections: Connection[], messageToSend: SendMessage) => {
		connections.value = settingsConnections;
		selectedMessage.value = messageToSend;
		step.value = 'connection';
		stepTitle.value = 'Select connection';
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const kafka = new KafkaManager();

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const setConnection = async (connection: Connection) => {
	loader?.value?.show();
	try {
		await kafka.setConnection(
			connection.brokers,
			connection.auth,
			connection.groupPrefix
		);

		topics.value = await kafka.listTopics();

		// Next step
		step.value = 'topic';
		stepTitle.value = 'Select topic';
	} catch (error) {
		await message(`Error setting the connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;

	// Next step
	step.value = 'message';
	stepTitle.value = 'Send message';
};

const sendMessage = async (key: string, value: string) => {
	loader?.value?.show();
	try {
		await kafka.sendMessage(selectedTopic.value!.name, key, value);

		stepperDialog.value?.close();
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Send storage message" :modal-class="step === 'message' ? 'w-full h-full' : ''">
		<!-- TODO: show step nicer -->
		<p>STEP: {{ stepTitle }}</p>

		<SelectConnection v-if="step === 'connection'" :connections="connections" :submit="setConnection" />
		<SelectTopic v-if="step === 'topic'" :submit="selectTopic" :topics="topics" />
		<EditMessage v-if="step === 'message'" :message="selectedMessage!" :submit="sendMessage" :submit-button-text="'Send'" />
  </Dialog>
</template>