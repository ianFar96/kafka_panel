
<script setup lang="ts">
import { ref } from 'vue';
import { randomColor } from '../services/chipColors';
import { Message } from '../types/message';
import Chip, { Tag } from './Chip.vue';
import Dialog from './Dialog.vue';

const props = defineProps<{
  saveMessage: (message: Message, tags: string[]) => Promise<void>
}>();

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

defineExpose({
	openDialog: (messageToSave: Message) => {
		message.value = messageToSave;
		dialog.value?.openDialog();
	},
	closeDialog: () => dialog.value?.closeDialog(),
});

const message = ref<Message>();
const tags = ref<Tag[]>([]);

const handleSubmit = async () => {
	if (tags.value.length <= 0) return;

	dialog.value?.closeDialog();

	await props.saveMessage(message.value!, tags.value.map(tag => tag.name));

	// Reset form
	tags.value = [];
};

const deleteTag = (tagToRemove: Tag) => {
	tags.value = tags.value.filter(tag => tag.name !== tagToRemove.name);
};

const tagsInput = ref<HTMLInputElement | null>(null); // Template ref

const addTagOnEnter = (event: KeyboardEvent) => {
	if (event.key === 'Enter') {
		const input  = event.target as HTMLInputElement;
		if (input.value !== '' && !tags.value.some(tag => tag.name === input.value)) {
			tags.value.push({
				name: input.value,
				color: randomColor()
			});
		}
		input.value = '';
		tagsInput.value?.focus();
	}
};
</script>

<template>
  <Dialog ref="dialog" :title="'Save message on storage'">
		<div class="h-full">
			<input class="bg-transparent border-b-white border-b outline-none px-2 py-1 w-full mb-4"
				placeholder="Type the tag and press enter" autofocus ref="tagsInput" 
				@keyup="addTagOnEnter($event)" type="text">
			<div class="min-h-[theme(spacing.14)]">
				<ul class="flex flex-wrap">
					<li v-for="tag in tags" :key="tag.name">
						<Chip :chip-color="tag.color" class="mr-2 mb-2 cursor-pointer flex items-center" @click="deleteTag(tag)">
							<span class="mr-1">{{ tag.name }}</span>
							<i class="bi-x-lg text-sm"></i>
						</Chip>
					</li>
				</ul>
			</div>
		</div>
		<div class="mt-8 flex justify-end flex-shrink-0">
			<button type="button" @click="handleSubmit()"
				class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
				Save
			</button>
		</div>
  </Dialog>
</template>