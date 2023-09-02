<!-- eslint-disable no-case-declarations -->

<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { clone } from 'ramda';
import { ref } from 'vue';
import { useConnectionStore } from '../composables/connection';
import { useLoader } from '../composables/loader';
import kafkaService from '../services/kafka';
import { getDefaultAutosendConfiguration, getDefaultMessage, isSendValid, isValidHeaders } from '../services/utils';
import { Autosend, AutosendOptions } from '../types/autosend';
import { Connection } from '../types/connection';
import { MessageContent, ParsedHeaders } from '../types/message';
import { Topic } from '../types/topic';
import Dialog from './Dialog.vue';
import EditAutosendConfiguration from './EditAutosendConfiguration.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import SelectConnection from './SelectConnection.vue';
import SelectTopic from './SelectTopic.vue';
import Stepper, { Step } from './Stepper.vue';

const emit = defineEmits<{
	(emit: 'submit', autosend: Autosend): Promise<void> | void,
}>();

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const configuration = ref<AutosendOptions>(getDefaultAutosendConfiguration());
const selectedTopic = ref<Topic>();
const selectedMessage = ref<MessageContent>();

const steps: Step[] = [{
	name: 'configuration',
	label: 'Configuration',
	isValid: () => {
		const hasDuration = configuration.value?.duration.time_unit && configuration.value?.duration.value;
		const hasInterval = configuration.value?.interval.time_unit && configuration.value?.interval.value;
		return !!hasDuration && !!hasInterval;
	}
},
{
	name: 'connection',
	label: 'Select connection',
	isValid: () => !!connectionStore.connection
},
{
	name: 'topic',
	label: 'Select topic',
	onBeforeLoad: async () => {
		topics.value = await kafkaService.listTopics();
	},
	isValid: () => !!selectedTopic.value
},
{
	name: 'message',
	label: 'Edit Message',
	isValid: () => isSendValid(selectedMessage.value?.value) && isSendValid(selectedMessage.value?.key)
},
{
	name: 'headers',
	label: 'Edit Headers',
	isValid: () => isValidHeaders(selectedMessage.value?.headers ?? {})
}];

defineExpose({
	openDialog: (settingsConnections: Connection[], messageContent?: MessageContent) => {
		connections.value = settingsConnections;
		selectedMessage.value = messageContent ? clone(messageContent) : getDefaultMessage();
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

const onConfigurationChange = (newConfiguration: AutosendOptions) => {
	configuration.value = newConfiguration;
};
	
const setNewConnection = async (newConnection: Connection) => {
	loader?.value?.show();
	try {
		await connectionStore.setConnection(newConnection);
		stepper.value?.next();
	} catch (error) {
		await message(`Error setting the connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;
	stepper.value?.next();
};

const onContentChange = (message: Partial<Omit<MessageContent, 'headers'>>) => {
	selectedMessage.value!.key = message.key;
	selectedMessage.value!.value = message.value;
};

const onHeadersChange = (headers: ParsedHeaders) => {
	selectedMessage.value!.headers = headers;
};

const startAutosend = async () => {
	loader?.value?.show();
	try {
		const autosend: Autosend = {
			headers: selectedMessage.value!.headers,
			key: selectedMessage.value!.key,
			value: selectedMessage.value!.value,
			options: configuration.value!,
			topic: selectedTopic.value!.name
		};

		await emit('submit', autosend);

		stepperDialog.value?.close();
	} catch (error) {
		await message(`Error starting the autosend: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Start autosend">
		<Stepper ref="stepper" class="mb-8" :steps="steps" submit-button-text="Start" @submit="startAutosend">
			<!-- Steps -->
			<template #configuration>
				<EditAutosendConfiguration :configuration="configuration" @change="onConfigurationChange" />
			</template>
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
				<EditMessageHeaders :headers="selectedMessage?.headers" @change="onHeadersChange" />
			</template>
		</Stepper>
  </Dialog>
</template>