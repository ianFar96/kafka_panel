<script setup lang="ts">
import { ref } from 'vue';
import { getRandomColor } from '../services/chipColors';
import Chip, { Tag } from './Chip.vue';

const props = defineProps<{
	tags?: string[]
}>();

const emit = defineEmits<{
	(event: 'change', tags: string[]): Promise<void> | void
}>();

const stringsToTags = (strings: string[]) => {
	return strings?.map(tag => ({name: tag, color: getRandomColor()}));
};

const tagsToStrings = (tags: Tag[]) => {
	return tags.map(tag => tag.name);
};

const tags = ref<Tag[]>(stringsToTags(props.tags || []));

const deleteTag = async (tagToRemove: Tag) => {
	tags.value = tags.value.filter(tag => tag.name !== tagToRemove.name);
	await emit('change', tagsToStrings(tags.value));
};

const tagsInput = ref<HTMLInputElement | null>(null); // Template ref

const addTagOnEnter = async (event: KeyboardEvent) => {
	if (event.key === 'Enter') {
		await addTag();
	}
};

const addTag = async () => {
	if (tagsInput.value && tagsInput.value.value !== '' && !tags.value.some(tag => tag.name === tagsInput.value?.value)) {
		tags.value.push({
			name: tagsInput.value.value,
			color: getRandomColor()
		});

		await emit('change', tagsToStrings(tags.value));

		tagsInput.value.value = '';
		tagsInput.value?.focus();
	}
};
</script>

<template>
	<div v-bind.sync="$attrs" class="h-full">
		<div class="flex mb-4">
			<input class="bg-transparent border-b-white border-b outline-none px-2 py-1 w-full mr-4"
				placeholder="Type the tag and press enter" autofocus ref="tagsInput"
				@keyup="addTagOnEnter($event)" type="text">
			<button class="bi-plus-circle text-2xl hover:text-orange-400 transition-colors"
				title="Add to tags" @click="addTag" type="button">
			</button>
		</div>
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
</template>