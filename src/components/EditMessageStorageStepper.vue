
<script setup lang="ts">
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { StorageMessage } from '../types/message';
import EditTags from './EditTags.vue';
import EditMessage from './EditMessage.vue';
import Dialog from './Dialog.vue';
import { clone } from 'ramda';

type Steps = 'tags' | 'message'

const selectedMessage = ref<StorageMessage>();

const step = ref<Steps>('tags');
const stepTitle = ref<string>('');

const props = defineProps<{
  submit: (message: StorageMessage) => Promise<unknown> | unknown
}>();

defineExpose({
	openDialog: (messageToEdit: StorageMessage) => {
		selectedMessage.value = clone(messageToEdit);
		step.value = 'tags';
		stepTitle.value = 'Edit tags';
		stepperDialog.value?.open();
	},
	closeDialog: () => {
		stepperDialog.value?.close();
	},
});

const loader = useLoader();

const setTags = (selectedTags: string[]) => {
	selectedMessage.value!.tags = selectedTags;

	step.value = 'message';
	stepTitle.value = 'Edit message';
};

const saveMessage = async (key: string, value: string) => {
	if (!key || !value) return;

	loader?.value?.show();
	await props.submit({
		id: selectedMessage.value!.id,
		key,
		value,
		tags: selectedMessage.value!.tags
	});
	loader?.value?.hide();

	stepperDialog.value?.close();
};

const stepperDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref
</script>

<template>
	<Dialog ref="stepperDialog" title="Edit storage message" :modal-class="step === 'message' ? 'w-full h-full' : ''">
		<!-- TODO: show step nicer -->
		<p>STEP: {{ stepTitle }}</p>

		<EditTags v-if="step === 'tags'" :tags="selectedMessage?.tags || []" :submit="setTags" :submit-button-text="'Next'" />
		<EditMessage v-if="step === 'message'" :message="selectedMessage" :submit="saveMessage" :submit-button-text="'Save'" />
	</Dialog>
</template>