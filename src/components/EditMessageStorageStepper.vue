
<script setup lang="ts">
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { StorageMessage } from '../types/message';
import EditMessageDialog from './EditMessageDialog.vue';
import EditTagsDialog from './EditTagsDialog.vue';

const selectedMessage = ref<StorageMessage>();

const props = defineProps<{
  submit: (message: StorageMessage) => Promise<unknown> | unknown
}>();

defineExpose({
	openDialog: (messageToEdit: StorageMessage) => {
		selectedMessage.value = messageToEdit;
		editTagsDialog.value?.openDialog(selectedMessage.value.tags);
	},
	closeDialog: () => {
		editTagsDialog.value?.closeDialog();
		editMessageDialog.value?.closeDialog();
	},
});

const loader = useLoader();

const tags = ref<string[]>([]);
const setTags = (selectedTags: string[]) => {
	editTagsDialog.value?.closeDialog();
	tags.value = selectedTags;

	editMessageDialog.value?.openDialog(selectedMessage.value);
};

const saveMessage = async (key: string, value: string) => {
	if (!key || !value) return;

	loader?.value?.show();
	await props.submit({
		id: selectedMessage.value!.id,
		key,
		value,
		tags: tags.value
	});
	loader?.value?.hide();

	editMessageDialog.value?.closeDialog();
};

const editTagsDialog = ref<InstanceType<typeof EditTagsDialog> | null>(null); // Template ref
const editMessageDialog = ref<InstanceType<typeof EditMessageDialog> | null>(null); // Template ref
</script>

<template>
	<EditTagsDialog ref="editTagsDialog" :submit="setTags" :submit-button-text="'Next'" />
	<EditMessageDialog ref="editMessageDialog" :submit="saveMessage" :submit-button-text="'Save'" />
</template>