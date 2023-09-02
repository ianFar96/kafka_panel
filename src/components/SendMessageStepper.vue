
<script setup lang="ts">
import { clone } from 'ramda';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { getDefaultMessage, isSendValid, isValidHeaders } from '../services/utils';
import { MessageContent, ParsedHeaders } from '../types/message';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import Stepper, { Step } from './Stepper.vue';

const steps: Step[] = [{
	name:'message',
	label: 'Content',
	isValid: () => isSendValid(selectedMessage.value?.key) && isSendValid(selectedMessage.value?.value)
},
{
	name:'headers',
	label: 'Headers',
	isValid: () => isValidHeaders(selectedMessage.value?.headers ?? {})
}];

const selectedMessage = ref<MessageContent>();

const emit = defineEmits<{
	(emit: 'submit', message: MessageContent): Promise<void> | void,
}>();

defineExpose({
	openDialog: (messageToEdit?: MessageContent) => {
		selectedMessage.value = messageToEdit ? clone(messageToEdit) : getDefaultMessage();
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

const sendMessage = async () => {
	loader?.value?.show();
	await emit('submit', selectedMessage.value!);
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
</script>

<template>
	<Dialog ref="stepperDialog" title="Send message">
		<Stepper class="mb-8" :steps="steps" @submit="sendMessage" submit-button-text="Send">
			<template #message>
				<EditMessageContent :message="selectedMessage" 
					@change="onContentChange"/>
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage?.headers"
					@change="onHeadersChange" />
			</template>
		</Stepper>
	</Dialog>
</template>