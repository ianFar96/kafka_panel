
<script setup lang="ts">
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { MessageContent, ParsedHeaders, StorageMessage } from '../types/message';
import EditTags from './EditTags.vue';
import EditMessageContent from './EditMessageContent.vue';
import Dialog from './Dialog.vue';
import { clone } from 'ramda';
import Stepper, { Step } from './Stepper.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';

const steps: Step[] = [
	{name:'tags', label: 'Tags'},
	{name:'message', label: 'Content'},
	{name:'headers', label: 'Headers '},
];

const selectedMessage = ref<StorageMessage>();

const activeStep = ref<Step>(steps[0]);

const props = defineProps<{
  submit: (message: StorageMessage) => Promise<unknown> | unknown
}>();

defineExpose({
	openDialog: (messageToEdit: StorageMessage) => {
		selectedMessage.value = clone(messageToEdit);
		activeStep.value = steps[0];
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const setTags = (selectedTags: string[]) => {
	selectedMessage.value!.tags = selectedTags;

	activeStep.value = steps[1];
};

const setMessageContent = async (message: Omit<MessageContent, 'headers'>) => {
	if (!message.key || !message.value) return;

	selectedMessage.value!.key = message.key;
	selectedMessage.value!.value = message.value;

	activeStep.value = steps[2];
};

const saveMessage = async (headers: ParsedHeaders) => {
	loader?.value?.show();
	await props.submit({
		id: selectedMessage.value!.id,
		headers,
		key: selectedMessage.value!.key,
		value: selectedMessage.value!.value,
		tags: selectedMessage.value!.tags
	});
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const onStepClick = (step: Step) => {
	switch (step.name) {
	case 'message':
		if ((selectedMessage.value?.tags.length || 0) > 0) {
			activeStep.value = step;
		}
		break;

	case 'headers':
		if ((selectedMessage.value?.tags.length || 0) > 0 && selectedMessage.value?.key && selectedMessage.value?.value) {
			activeStep.value = step;
		}
		break;

	default:
		activeStep.value = step;
		break;
	}
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Edit storage message" :modal-class="activeStep.name === 'message' ? 'w-full h-full' : ''">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<template #tags>
				<EditTags class="mt-8" :tags="selectedMessage?.tags || []" :submit="setTags" :submit-button-text="'Next'" />
			</template>
			<template #message>
				<EditMessageContent :message="selectedMessage" :submit="setMessageContent" :submit-button-text="'Next'" />
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage?.headers" :submit="saveMessage" :submit-button-text="'Save'" />
			</template>
		</Stepper>
	</Dialog>
</template>