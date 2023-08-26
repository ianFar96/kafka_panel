
<script setup lang="ts">
import { clone } from 'ramda';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { MessageContent, ParsedHeaders } from '../types/message';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import Stepper, { Step } from './Stepper.vue';

const steps: Step[] = [
	{name:'message', label: 'Content'},
	{name:'headers', label: 'Headers'},
];

const selectedMessage = ref<MessageContent>();

const activeStep = ref<Step>(steps[0]);

const props = defineProps<{
  submit: (message: MessageContent) => Promise<unknown> | unknown,
	submitButtonText?: string
}>();

defineExpose({
	openDialog: (messageToEdit?: MessageContent) => {
		selectedMessage.value = messageToEdit && clone(messageToEdit);
		activeStep.value = steps[0];
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const setMessageContent = async (message: Omit<MessageContent, 'headers'>) => {
	if (!message.key || !message.value) return;

	selectedMessage.value = {
		key: message.key,
		value: message.value,
		headers: selectedMessage.value?.headers ?? null
	};

	activeStep.value = steps[1];
};

const saveMessage = async (headers: ParsedHeaders) => {
	loader?.value?.show();

	selectedMessage.value!.headers = headers;
	await props.submit(selectedMessage.value!);

	loader?.value?.hide();
	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const onStepClick = (step: Step) => {
	switch (step.name) {
	case 'headers':
		if (selectedMessage.value?.key && selectedMessage.value?.value) {
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
	<Dialog ref="stepperDialog" title="Edit message" :modal-class="activeStep.name === 'message' ? 'w-full h-full' : ''">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<template #message>
				<EditMessageContent :message="selectedMessage" :submit="setMessageContent" :submit-button-text="'Next'" />
			</template>
			<template #headers>
				<EditMessageHeaders class="mt-8" :headers="selectedMessage?.headers" :submit="saveMessage" :submit-button-text="submitButtonText ?? 'Save'" />
			</template>
		</Stepper>
	</Dialog>
</template>