
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { Connection } from '../types/connection';
import { SendMessage } from '../types/message';
import { Topic } from '../types/topic';
import EditMessageContent from './EditMessageContent.vue';
import SelectTopic from './SelectTopic.vue';
import SelectConnection from './SelectConnection.vue';
import Dialog from './Dialog.vue';
import Stepper, { Step } from './Stepper.vue';
import { useConnection } from '../composables/connection';
import kafkaService from '../services/kafka';

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const selectedMessage = ref<SendMessage>();

const selectedTopic = ref<Topic>();

const steps: Step[] = [
	{name: 'connection', label: 'Select connection'},
	{name: 'topic', label: 'Select topic'},
	{name: 'message', label: 'Send message'},
];
const activeStep = ref<Step>(steps[0]);

defineExpose({
	openDialog: (settingsConnections: Connection[], messageToSend: SendMessage) => {
		connections.value = settingsConnections;
		selectedMessage.value = messageToSend;
		activeStep.value = steps[0];
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const { connection, setConnection } = useConnection();

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const onStepClick = (step: Step) => {
	switch (step.name) {
	case 'topic':
		if (connection.value) {
			activeStep.value = step;
		}
		break;
	case 'message':
		if (connection.value && selectedTopic.value) {
			activeStep.value = step;
		}
		break;
	
	default:
		activeStep.value = step;
		break;
	}
};

const setNewConnection = async (newConnection: Connection) => {
	loader?.value?.show();
	try {
		await setConnection(newConnection);

		topics.value = await kafkaService.listTopics();

		// Next step
		activeStep.value = steps[1];
	} catch (error) {
		await message(`Error setting the connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;

	// Next step
	activeStep.value = steps[2];
};

const sendMessage = async (key: string, value: string) => {
	loader?.value?.show();
	try {
		await kafkaService.sendMessage(selectedTopic.value!.name, key, value);

		stepperDialog.value?.close();
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Send storage message" :modal-class="activeStep.name === 'message' ? 'w-full h-full' : ''">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<!-- Steps -->
			<template #connection>
				<SelectConnection :connections="connections" :submit="setNewConnection" />
			</template>
			<template #topic>
				<SelectTopic :submit="selectTopic" :topics="topics" />
			</template>
			<template #message>
				<EditMessageContent :message="selectedMessage!" :submit="sendMessage" :submit-button-text="'Send'" />
			</template>
		</Stepper>
  </Dialog>
</template>