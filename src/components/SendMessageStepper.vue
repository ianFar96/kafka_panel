
<script setup lang="ts">
import { clone } from 'ramda';
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { getDefaultMessage, isKeyValid, isValidHeaders } from '../services/utils';
import { MessageContent, Headers, MessageKeyValue } from '../types/message';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import Stepper, { Step } from './Stepper.vue';

const steps: Step[] = [{
	name:'message',
	label: 'Content',
	isValid: () => isKeyValid(selectedMessage.value.key)
},
{
	name:'headers',
	label: 'Headers',
	isValid: () => isValidHeaders(selectedMessage.value.headers)
}];

const selectedMessage = ref<MessageContent>(getDefaultMessage());

const emit = defineEmits<{
	(emit: 'submit', message: MessageContent): Promise<void> | void,
}>();

defineExpose({
	openDialog: (messageToEdit?: MessageContent) => {
		if (messageToEdit) {
			selectedMessage.value = clone(messageToEdit);
		}
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const onContentChange = (message: MessageKeyValue) => {
	selectedMessage.value.key = message.key;
	selectedMessage.value.value = message.value;
};

const onHeadersChange = (headers: Headers) => {
	selectedMessage.value.headers = headers;
};

const sendMessage = async () => {
	loader?.value?.show();
	await emit('submit', selectedMessage.value);
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
</script>

<template>
	<Dialog size="fullpage" ref="stepperDialog" title="Send message">
		<Stepper class="mb-8" :steps="steps" @submit="sendMessage" submit-button-text="Send">
			<template #message>
				<EditMessageContent :message="selectedMessage" @change="onContentChange"/>
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage.headers" @change="onHeadersChange" />
			</template>
		</Stepper>
	</Dialog>
</template>