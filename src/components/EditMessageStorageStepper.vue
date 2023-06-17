
<script setup lang="ts">
import { Ref, inject, ref } from 'vue';
import { StorageMessage } from '../types/message';
import ChooseTagsDialog from './ChooseTagsDialog.vue';
import EditMessageDialog from './EditMessageDialog.vue';
import Loader from './Loader.vue';

const selectedMessage = ref<StorageMessage>();

const props = defineProps<{
  submit: (message: StorageMessage) => Promise<unknown> | unknown
}>();

defineExpose({
	openDialog: (messageToEdit: StorageMessage) => {
		selectedMessage.value = messageToEdit;
		chooseTagsDialog.value?.openDialog(selectedMessage.value.tags);
	},
	closeDialog: () => {
		chooseTagsDialog.value?.closeDialog();
		editMessageDialog.value?.closeDialog();
	},
});

const loader = inject<Ref<InstanceType<typeof Loader> | null>>('loader');

const tags = ref<string[]>([]);
const setTags = (selectedTags: string[]) => {
	chooseTagsDialog.value?.closeDialog();
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

const chooseTagsDialog = ref<InstanceType<typeof ChooseTagsDialog> | null>(null); // Template ref
const editMessageDialog = ref<InstanceType<typeof EditMessageDialog> | null>(null); // Template ref
</script>

<template>
	<ChooseTagsDialog ref="chooseTagsDialog" :submit="setTags" :submit-button-text="'Next'" />
	<EditMessageDialog ref="editMessageDialog" :submit="saveMessage" :submit-button-text="'Save'" />
</template>