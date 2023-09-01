
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import kafkaService from '../services/kafka';
import { Connection } from '../types/connection';
import { MessageContent, ParsedHeaders } from '../types/message';
import { Topic } from '../types/topic';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import SelectConnection from './SelectConnection.vue';
import SelectTopic from './SelectTopic.vue';
import Stepper, { Step } from './Stepper.vue';
import { useConnectionStore } from '../composables/connection';
import { isSendValid } from '../services/utils';
import Button from './Button.vue';
import { clone } from 'ramda';

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const selectedMessage = ref<MessageContent>();

const selectedTopic = ref<Topic>();

const steps: Step[] = [
	{name: 'connection', label: 'Select connection'},
	{name: 'topic', label: 'Select topic'},
	{name: 'message', label: 'Message Content'},
	{name: 'headers', label: 'Message Headers'},
];
const activeStep = ref<Step>(steps[0]);

defineExpose({
	openDialog: (settingsConnections: Connection[], messageToSend: MessageContent) => {
		connections.value = settingsConnections;
		selectedMessage.value = clone(messageToSend);
		activeStep.value = steps[0];
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const connectionStore = useConnectionStore();

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const onStepClick = async (step: Step) => {
	switch (step.name) {
	case 'topic':
		topics.value = await kafkaService.listTopics();

		if (connectionStore.connection) {
			activeStep.value = step;
		}
		break;
	case 'message':
		if (selectedTopic.value) {
			activeStep.value = step;
		}
		break;
	case 'headers':
		if (isSendValid(selectedMessage.value?.key) && isSendValid(selectedMessage.value?.value)) {
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
		await connectionStore.setConnection(newConnection);

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

const onContentChange = (message: Partial<Omit<MessageContent, 'headers'>>) => {
	selectedMessage.value!.key = message.key;
	selectedMessage.value!.value = message.value;
};

const onHeadersChange = (headers: ParsedHeaders) => {
	selectedMessage.value!.headers = headers;
};

const saveMessage = async () => {
	loader?.value?.show();
	try {
		await kafkaService.sendMessage(selectedTopic.value!.name, selectedMessage.value!);

		stepperDialog.value?.close();
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Send storage message">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<!-- Steps -->
			<template #connection>
				<SelectConnection :selected-connection="connectionStore.connection?.name"
					:connections="connections" :submit="setNewConnection" />
				<div class="flex justify-end mt-4">
					<Button color="orange" @click="onStepClick(steps[1])">Next</Button>
				</div>
			</template>
			<template #topic>
				<SelectTopic :selected-topic="selectedTopic?.name" :submit="selectTopic" :topics="topics" />
				<div class="flex justify-end mt-4">
					<Button color="orange" @click="onStepClick(steps[2])">Next</Button>
				</div>
			</template>
			<template #message>
				<EditMessageContent :message="selectedMessage" 
					@change="onContentChange"/>
				<div class="flex justify-end mt-4">
					<Button color="orange" @click="onStepClick(steps[3])">Next</Button>
				</div>
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage?.headers"
					@change="onHeadersChange" />
				<div class="flex justify-end mt-4">
					<Button color="green" @click="saveMessage">Send</Button>
				</div>
			</template>
		</Stepper>
  </Dialog>
</template>