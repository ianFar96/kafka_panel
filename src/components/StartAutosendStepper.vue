<!-- eslint-disable no-case-declarations -->

<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useConnection } from '../composables/connection';
import { useLoader } from '../composables/loader';
import kafkaService from '../services/kafka';
import { Connection } from '../types/connection';
import { Topic } from '../types/topic';
import Dialog from './Dialog.vue';
import EditMessage from './EditMessage.vue';
import SelectConnection from './SelectConnection.vue';
import SelectTopic from './SelectTopic.vue';
import Stepper, { Step } from './Stepper.vue';
import { Autosend, AutosendOptions } from '../types/autosend';
import EditAutosendConfiguration from './EditAutosendConfiguration.vue';

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

const steps: Step[] = [
	{name: 'configuration', label: 'Configuration'},
	{name: 'connection', label: 'Select connection'},
	{name: 'topic', label: 'Select topic'},
	{name: 'message', label: 'Start autosend'},
];
const activeStep = ref<Step>(steps[0]);

defineExpose({
	openDialog: (settingsConnections: Connection[]) => {
		connections.value = settingsConnections;
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
	case 'connection':
		const hasDuration = configuration.value?.duration.time_unit && configuration.value?.duration.value;
		const hasInterval = configuration.value?.interval.time_unit && configuration.value?.interval.value;
		if ( hasDuration && hasInterval ) {
			activeStep.value = step;
		}
		break;
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

const setConfiguration = async (newConfiguration: AutosendOptions) => {
	configuration.value = newConfiguration;

	// Next step
	activeStep.value = steps[1];
};

const setNewConnection = async (newConnection: Connection) => {
	loader?.value?.show();
	try {
		await setConnection(newConnection);

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

const startAutosend = async (key: string, value: string) => {
	loader?.value?.show();
	try {
		const autosend: Autosend = {
			key: JSON.parse(key),
			value: JSON.parse(value),
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
	<Dialog ref="stepperDialog" title="Start autosend" :modal-class="activeStep.name === 'message' ? 'w-full h-full' : ''">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<!-- Steps -->
			<template #configuration>
				<EditAutosendConfiguration :configuration="configuration" />
				<div class="flex justify-end">
					<button class="border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400"
						@click="onStepClick(steps[1])">
						Next
					</button>
				</div>
			</template>
			<template #connection>
				<SelectConnection :connections="connections" :submit="setNewConnection" />
			</template>
			<template #topic>
				<SelectTopic :submit="selectTopic" :topics="topics" />
			</template>
			<template #message>
				<EditMessage :submit="startAutosend" :submit-button-text="'Start'" />
			</template>
		</Stepper>
  </Dialog>
</template>