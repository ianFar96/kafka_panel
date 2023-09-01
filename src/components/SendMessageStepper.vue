
<script setup lang="ts">
import { clone } from 'ramda';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { MessageContent, ParsedHeaders } from '../types/message';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import Stepper, { Step } from './Stepper.vue';
import Button from './Button.vue';
import { getDefaultMessage, isSendValid } from '../services/utils';

const steps: Step[] = [
	{name:'message', label: 'Content'},
	{name:'headers', label: 'Headers'},
];

const selectedMessage = ref<MessageContent>();

const activeStep = ref<Step>(steps[0]);

const props = defineProps<{
  submit: (message: MessageContent) => Promise<unknown> | unknown,
}>();

defineExpose({
	openDialog: (messageToEdit?: MessageContent) => {
		selectedMessage.value = messageToEdit ? clone(messageToEdit) : getDefaultMessage();
		activeStep.value = steps[0];
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const onContentChange = (message: Partial<Omit<MessageContent, 'headers'>>) => {
	selectedMessage.value!.key = message.key;
	selectedMessage.value!.value = message.value;
};

const onHeadersChange = (headers: ParsedHeaders) => {
	selectedMessage.value!.headers = headers;
};

const saveMessage = async () => {
	// Check on valid headers
	for (const [key, value] of Object.entries(selectedMessage.value?.headers ?? {})) {
		if (!isSendValid(key) || !isSendValid(value)) {
			return;
		}
	}

	loader?.value?.show();

	await props.submit(selectedMessage.value!);

	loader?.value?.hide();
	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
const onStepClick = (step: Step) => {
	switch (step.name) {
	case 'message':
		activeStep.value = step;
		break;
	case 'headers':
		if (isSendValid(selectedMessage.value?.key) && isSendValid(selectedMessage.value?.value)) {
			activeStep.value = step;
		}
		break;
	}
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Edit message">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<template #message>
				<EditMessageContent :message="selectedMessage" 
					@change="onContentChange"/>
				<div class="flex justify-end mt-4">
					<Button color="orange" @click="onStepClick(steps[1])">Next</Button>
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