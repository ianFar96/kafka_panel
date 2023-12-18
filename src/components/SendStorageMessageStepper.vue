
<script setup lang="ts">
import { Ref, ref } from 'vue';
import { useLoader } from '../composables/loader';
import { Connection } from '../types/connection';
import { MessageContent, Headers, MessageKeyValue } from '../types/message';
import { Topic } from '../types/topic';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import SelectConnection from './SelectConnection.vue';
import SelectTopic from './SelectTopic.vue';
import Stepper, { Step } from './Stepper.vue';
import { useConnectionStore } from '../composables/connection';
import { isKeyValid, isValidHeaders } from '../services/utils';
import { clone } from 'ramda';
import logger from '../services/logger';
import { KafkaService } from '../services/kafka';
import { useAlertDialog } from '../composables/alertDialog';

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);

// Force the type so it cannot be undefined
// The message will be set when the modal is opened
const selectedMessage = ref() as Ref<MessageContent>;

const selectedTopic = ref<Topic>();

const kafkaService = new KafkaService();

const alert = useAlertDialog();

const fetchTopics = async () => {
	loader?.value?.show();
	try {
		topics.value = await kafkaService.listTopics();
	} catch (error) {
		const errorMessage = `Error fetching topics: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
};

const steps: Step[] = [{
	name: 'connection',
	label: 'Select connection',
	isValid: () => !!connectionStore.connection
},
{
	name: 'topic',
	label: 'Select topic',
	isValid: () => !!selectedTopic.value,
	onBeforeLoad: fetchTopics
},
{
	name: 'message',
	label: 'Message Content',
	isValid: () => isKeyValid(selectedMessage.value.key)
},
{
	name: 'headers',
	label: 'Message Headers',
	isValid: () => isValidHeaders(selectedMessage.value.headers)
}];

defineExpose({
	openDialog: (settingsConnections: Connection[], messageToSend: MessageContent) => {
		connections.value = settingsConnections;
		selectedMessage.value = clone(messageToSend);
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const connectionStore = useConnectionStore();

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const stepper = ref<InstanceType<typeof Stepper> | null>(null); // Template ref

const setNewConnection = async (newConnection: Connection) => {
	loader?.value?.show();
	try {
		await connectionStore.setConnection(newConnection);
		await stepper.value?.next();
	} catch (error) {
		const errorMessage = `Error setting the connection: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;
	await stepper.value?.next();
};

const onContentChange = (message: MessageKeyValue) => {
	selectedMessage.value.key = message.key;
	selectedMessage.value.value = message.value;
};

const onHeadersChange = (headers: Headers) => {
	selectedMessage.value.headers = headers;
};

const sendMessage = async () => {
	if (!selectedTopic.value) {
		throw new Error('Unexpected error, topic is not selected');
	}

	loader?.value?.show();
	try {
		await kafkaService.sendMessage(selectedTopic.value.name, selectedMessage.value);

		stepperDialog.value?.close();
	} catch (error) {
		const errorMessage = `Error sending the message: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog size="fullpage" ref="stepperDialog" title="Send storage message">
		<Stepper class="mb-8" ref="stepper" :steps="steps" submit-button-text="Send" @submit="sendMessage">
			<!-- Steps -->
			<template #connection>
				<SelectConnection :selected-connection="connectionStore.connection?.name"
					:connections="connections" @submit="setNewConnection" />
			</template>
			<template #topic>
				<SelectTopic :selected-topic="selectedTopic?.name" @submit="selectTopic" :topics="topics" />
			</template>
			<template #message>
				<EditMessageContent :message="selectedMessage" @change="onContentChange"/>
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage.headers" @change="onHeadersChange" />
			</template>
		</Stepper>
  </Dialog>
</template>