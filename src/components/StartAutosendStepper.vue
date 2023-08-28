<!-- eslint-disable no-case-declarations -->

<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import kafkaService from '../services/kafka';
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
import { useConnectionStore } from '../composables/connection';

const props = defineProps<{
	submit: (autosend: Autosend) => Promise<void>,
}>();

const connections = ref<Connection[]>([]);
const topics = ref<Topic[]>([]);
const configuration = ref<AutosendOptions>({
	duration:{
		time_unit: 'Minutes',
		value: 10
	},
	interval:{
		time_unit: 'Seconds',
		value: 1
	}
});
const selectedTopic = ref<Topic>();
const selectedContent = ref<MessageContent>();

const steps: Step[] = [
	{name: 'configuration', label: 'Configuration'},
	{name: 'connection', label: 'Select connection'},
	{name: 'topic', label: 'Select topic'},
	{name: 'message', label: 'Edit Message'},
	{name: 'headers', label: 'Edit Headers'},
];
const activeStep = ref<Step>(steps[0]);

defineExpose({
	openDialog: (settingsConnections: Connection[], messageContent?: MessageContent) => {
		connections.value = settingsConnections;
		selectedContent.value = messageContent;

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
const onStepClick = (step: Step) => {
	switch (step.name) {
	case 'connection':
		const hasDuration = configuration.value?.duration.time_unit && configuration.value?.duration.value;
		const hasInterval = configuration.value?.interval.time_unit && configuration.value?.interval.value;
		if ( hasDuration && hasInterval ) {
			activeStep.value = step;
		}
		break;
	case 'topic':
		if (connectionStore.connection) {
			activeStep.value = step;
		}
		break;
	case 'message':
		if (connectionStore.connection && selectedTopic.value) {
			activeStep.value = step;
		}
		break;
	case 'headers':
		if (connectionStore.connection && selectedTopic.value && selectedContent.value?.value && selectedContent.value?.key) {
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

		topics.value = await kafkaService.listTopics();

		// Next step
		activeStep.value = steps[2];
	} catch (error) {
		await message(`Error setting the connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

const selectTopic = async (topic: Topic) => {
	selectedTopic.value = topic;

	// Next step
	activeStep.value = steps[3];
};

const setMessageContent = async (message: Omit<MessageContent, 'headers'>) => {	
	selectedContent.value = {
		key: message.key,
		value: message.value,
		headers: selectedContent.value?.headers ?? null
	};

	// Next step
	activeStep.value = steps[4];
};

const startAutosend = async (headers: ParsedHeaders) => {
	loader?.value?.show();
	try {
		const autosend: Autosend = {
			headers,
			key: selectedContent.value!.key,
			value: selectedContent.value!.value,
			options: configuration.value!,
			topic: selectedTopic.value!.name
		};

		await props.submit(autosend);

		stepperDialog.value?.close();
	} catch (error) {
		await message(`Error starting the autosend: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Start autosend">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<!-- Steps -->
			<template #configuration>
				<div class="flex flex-col h-full">
					<div class="h-full">
						<EditAutosendConfiguration :configuration="configuration" />
					</div>
					<div class="flex justify-end">
						<button class="border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400"
							@click="onStepClick(steps[1])">
							Next
						</button>
					</div>
				</div>
			</template>
			<template #connection>
				<SelectConnection :connections="connections" :submit="setNewConnection" />
			</template>
			<template #topic>
				<SelectTopic :submit="selectTopic" :topics="topics" />
			</template>
			<template #message>
				<EditMessageContent :submit="setMessageContent" :message="selectedContent" :submit-button-text="'Next'" />
			</template>
			<template #headers>
				<EditMessageHeaders :submit="startAutosend" submit-button-text="Start" :headers="selectedContent?.headers" />
			</template>
		</Stepper>
  </Dialog>
</template>