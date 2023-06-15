
<script setup lang="ts">
import { computed, ref } from 'vue';
import Dialog from './Dialog.vue';
import { Topic } from '../types/topic';

const props = defineProps<{
  topics: Topic[]
  selectTopic: (topic: Topic) => Promise<void>
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

const selectTopic = (topic: Topic) => {
	dialog.value?.closeDialog();
	props.selectTopic(topic);
};

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

defineExpose({
	openDialog: () => dialog.value?.openDialog(),
	closeDialog: () => dialog.value?.closeDialog(),
});

</script>

<template>
  <Dialog ref="dialog" :title="'Select a topic'" :closable="true" modal-class="flex flex-col">
    <div class="mb-6 flex justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
		</div>

		<ul class="h-full overflow-auto">
			<li v-for="topic, index in filteredTopics" :key="index" :class="{'border-b': index !== filteredTopics.length - 1}"
				class="border-white overflow-hidden flex justify-between py-2 px-3 cursor-pointer hover:bg-[#252526]" @click="selectTopic(topic)">
				<span class="mr-4">{{ topic.name }}</span>
        <i class="bi-arrow-right text-xl"></i>
			</li>
		</ul>
  </Dialog>
</template>