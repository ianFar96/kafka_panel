
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Topic } from '../types/topic';

const props = defineProps<{
  topics: Topic[]
	selectedTopic?: string
  submit: (topic: Topic) => Promise<void>
}>();

const searchQuery = ref('');

const filteredTopics = computed(() => {
	if (!searchQuery.value) return props.topics;
	return props.topics
		.filter(topic => {
			const query = searchQuery.value.toLowerCase();
			const includesName = topic.name.toLowerCase().includes(query);
			return includesName;
		});
});

const submit = (topic: Topic) => {
	props.submit(topic);
};

</script>

<template>
	<div class="h-full flex flex-col overflow-auto">
		<div class="mb-6 flex justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
		</div>
	
		<ul class="overflow-auto">
			<li v-for="topic, index in filteredTopics" :key="index" @click="submit(topic)"
				:class="{'border-b': index !== filteredTopics.length - 1, 'bg-gray-700': selectedTopic === topic.name}"
				class="border-white overflow-hidden flex justify-between p-3 cursor-pointer hover:bg-gray-700" >
				<span class="mr-4">{{ topic.name }}</span>
				<i v-if="selectedTopic === topic.name" class="bi-check-lg text-xl text-green-600"></i>
			</li>
		</ul>
	</div>
</template>