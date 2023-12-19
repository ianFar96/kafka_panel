
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Topic } from '../types/topic';

const props = defineProps<{
  topics: Topic[]
	selectedTopic?: string
}>();

const emit = defineEmits<{
  (event:'submit', topic: Topic): Promise<void> | void
}>();

const searchQuery = ref('');

const filteredTopics = computed(() => {
	if (!searchQuery.value) return props.topics;
	return props.topics
		.filter(topic => {
			const query = searchQuery.value.toLowerCase();
			const includesTopicName = query.split('.').every(chunk => topic.name.toLowerCase().includes(chunk));
			return includesTopicName;
		});
});

const submit = async (topic: Topic) => {
	await emit('submit', topic);
};
</script>

<template>
	<div class="h-full flex flex-col overflow-auto">
		<div class="mb-6 flex justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
		</div>

		<ul v-if="topics.length > 0" class="overflow-auto">
			<li v-for="topic, index in filteredTopics" :key="index" @click="submit(topic)"
				:class="{'border-b': index !== filteredTopics.length - 1, 'bg-gray-700': selectedTopic === topic.name}"
				class="border-white overflow-hidden flex justify-between p-3 cursor-pointer hover:bg-gray-700" >
				<span class="mr-4">{{ topic.name }}</span>
				<i v-if="selectedTopic === topic.name" class="h-6 bi-check-lg text-xl text-green-600"></i>
			</li>
		</ul>
		<div v-else class="flex justify-center items-center h-full">
			<span class="text-gray-400">
				You don't any topic yet, go to the <router-link to="/topics" class="border-b text-blue-400 border-blue-400">topics page</router-link> to create one
			</span>
		</div>
	</div>
</template>