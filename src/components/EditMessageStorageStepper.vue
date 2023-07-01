
<script setup lang="ts">
import { ref } from 'vue';
import { useLoader } from '../composables/loader';
import { StorageMessage } from '../types/message';
import EditTags from './EditTags.vue';
import EditMessage from './EditMessage.vue';
import Dialog from './Dialog.vue';
import { clone } from 'ramda';
import Stepper, { Step } from './Stepper.vue';

const steps: Step[] = [
	{name:'tags', label: 'Edit tags'},
	{name:'message', label: 'Edit message'},
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
const onStepClick = (step: Step) => {
	activeStep.value = step;
};
</script>

<template>
	<Dialog ref="stepperDialog" title="Edit storage message" :modal-class="activeStep.name === 'message' ? 'w-full h-full' : ''">
		<Stepper class="mb-8" :steps="steps" :active-step="activeStep" :onStepClick="onStepClick">
			<template #tags>
				<EditTags class="mt-8" :tags="selectedMessage?.tags || []" :submit="setTags" :submit-button-text="'Next'" />
			</template>
			<template #message>
				<EditMessage :message="selectedMessage" :submit="saveMessage" :submit-button-text="'Save'" />
			</template>
		</Stepper>
	</Dialog>
</template>