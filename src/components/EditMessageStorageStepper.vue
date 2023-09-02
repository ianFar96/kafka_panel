
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
import { isSendValid, isValidHeaders } from '../services/utils';

const selectedMessage = ref<StorageMessage>();

const steps: Step[] = [{
	name:'tags',
	label: 'Tags',
	isValid: () => (selectedMessage.value?.tags.length || 0) > 0
},
{
	name:'message',
	label: 'Content',
	isValid: () => isSendValid(selectedMessage.value?.key) && isSendValid(selectedMessage.value?.value)
},
{
	name:'headers',
	label: 'Headers',
	isValid: () => isValidHeaders(selectedMessage.value?.headers ?? {})
}];

const emit = defineEmits<{
	(emit: 'submit', message: StorageMessage): Promise<void> | void,
}>();

defineExpose({
	openDialog: (messageToEdit: StorageMessage) => {
		selectedMessage.value = clone(messageToEdit);
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const onTagsChange = (selectedTags: string[]) => {
	selectedMessage.value!.tags = selectedTags;
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
	await emit('submit', selectedMessage.value!);
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
</script>

<template>
	<Dialog ref="stepperDialog" title="Edit storage message">
		<Stepper class="mb-8" :steps="steps" @submit="saveMessage" submit-button-text="Save">
			<template #tags>
				<EditTags class="mt-8" :tags="selectedMessage!.tags" @change="onTagsChange" />
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