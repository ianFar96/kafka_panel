
<script setup lang="ts">
import { clone } from 'ramda';
import { Ref, ref } from 'vue';
import { useLoader } from '../composables/loader';
import { isKeyValid, isValidHeaders } from '../services/utils';
import { Headers, MessageKeyValue, StorageMessage } from '../types/message';
import Dialog from './Dialog.vue';
import EditMessageContent from './EditMessageContent.vue';
import EditMessageHeaders from './EditMessageHeaders.vue';
import EditTags from './EditTags.vue';
import Stepper, { Step } from './Stepper.vue';

// Force the type so it cannot be undefined
// The message will be set when the modal is opened
const selectedMessage = ref() as Ref<StorageMessage>;

const steps: Step[] = [{
	name:'tags',
	label: 'Tags',
	isValid: () => (selectedMessage.value.tags.length || 0) > 0
},
{
	name:'message',
	label: 'Content',
	isValid: () => isKeyValid(selectedMessage.value.key)
},
{
	name:'headers',
	label: 'Headers',
	isValid: () => isValidHeaders(selectedMessage.value.headers)
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
	selectedMessage.value.tags = selectedTags;
};

const onContentChange = (message: MessageKeyValue) => {
	selectedMessage.value.key = message.key;
	selectedMessage.value.value = message.value;
};

const onHeadersChange = (headers: Headers) => {
	selectedMessage.value.headers = headers;
};

const saveMessage = async () => {
	loader?.value?.show();
	await emit('submit', selectedMessage.value);
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
</script>

<template>
	<Dialog size="fullpage" ref="stepperDialog" title="Edit storage message">
		<Stepper class="mb-8" :steps="steps" @submit="saveMessage" submit-button-text="Save">
			<template #tags>
				<EditTags class="mt-8" :tags="selectedMessage.tags" @change="onTagsChange" />
			</template>
			<template #message>
				<EditMessageContent :message="selectedMessage" @change="onContentChange"/>
			</template>
			<template #headers>
				<EditMessageHeaders :headers="selectedMessage.headers" @change="onHeadersChange" />
			</template>
		</Stepper>
	</Dialog>
</template>