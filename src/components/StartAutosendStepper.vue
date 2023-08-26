<!-- eslint-disable no-case-declarations -->

<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { ref } from 'vue';
import { useConnection } from '../composables/connection';
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
	case 'headers':
		if (connection.value && selectedTopic.value && selectedContent.value?.value && selectedContent.value?.key) {
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
	if (!message.key || !message.value) return;
	
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

const exampleMessage = {
	key: {
		name: '{{faker.person.firstName(\'female\')}}'
	},
	value: {
		lastName: '{{faker.person.lastName()}}',
		phone: '{{faker.phone.imei()}}',
		address: '{{faker.location.streetAddress()}}, {{faker.location.county()}}, {{faker.location.country()}}'
	},
};

const exampleInterpolated = {
	key: {
		name: 'Anna'
	},
	value: {
		lastName: 'Grady',
		phone: '13-850489-913761-5',
		address: '34830 Erdman Hollow, Monroe County, U.S.A'
	},
};

const exampleKeyReuse = {
	key: {
		name: '{{faker.person.firstName(\'female\')}}',
		streetName: '{{faker.location.streetAddress()}}'
	},
	value: {
		lastName: '{{faker.person.lastName()}}',
		phone: '{{faker.phone.imei()}}',
		fullAddress: '{{key.streetName}}, {{faker.location.county()}}, {{faker.location.country()}}'
	},
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
				<div class="flex h-full">
					<div class="w-[75%] mr-6">
						<EditMessageContent :submit="setMessageContent" :message="selectedContent" :submit-button-text="'Next'" />
					</div>
					<div class="w-[25%] relative">
						<div class="absolute right-0 top-0 overflow-auto h-full w-full">
							<p class="mb-2">
								A very cool feature of autosends is <a class="underline hover:text-orange-400 transition-colors" target="_blank" href="https://fakerjs.dev/">faker.js</a> value interpolation. 
								You can replace any string content with a faker.js object or function as if you were calling the function from the faker object itself.
							</p>
							<highlightjs :language="'json'" :code="JSON.stringify(exampleMessage, null, 2)" />
							<p class="my-2">
								Will result in
							</p>
							<highlightjs :language="'json'" :code="JSON.stringify(exampleInterpolated, null, 2)" />
							<p class="my-2">
								The template provided is re-interpolated for each message sent, so every message will have a distinct and unique touch with realistic data!
							</p>
							<hr class="my-4">
							<p class="my-2">
								Need to re-use some autogenerated content from the key to the value? 
								Autosends got you covered, you only need to describe the path to the property you want to use.
							</p>
							<highlightjs :language="'json'" :code="JSON.stringify(exampleKeyReuse, null, 2)" />
						</div>
					</div>
				</div>
			</template>
			<template #headers>
				<EditMessageHeaders :submit="startAutosend" submit-button-text="Start" :headers="selectedContent?.headers" />
			</template>
		</Stepper>
  </Dialog>
</template>