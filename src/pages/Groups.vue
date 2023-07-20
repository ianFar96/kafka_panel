<script setup lang="ts">
import { confirm, message } from '@tauri-apps/api/dialog';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import kafkaService from '../services/kafka';
import { ConsumerGroup } from '../types/consumerGroup';

await checkSettings('topics');

const route = useRoute();

const topicName = route.params.topicName as string;

const loader = useLoader();

const groups = ref<ConsumerGroup[]>([]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchGroupsFromTopic = async () => {
	loader?.value?.show();
	try {
		groups.value = await kafkaService.listGroupsFromTopic(topicName);
	} catch (error) {
		await message(`Error getting groups: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
await fetchGroupsFromTopic();

const searchQuery = ref('');
const filteredGroups = computed(() => {
	if (!searchQuery.value) return groups.value;
	return groups.value
		.filter(group => {
			const query = searchQuery.value.toLowerCase();
			const includesGroupName = group.name.toLowerCase().includes(query);
			const includesGroupState = group.state.toLowerCase().includes(query);
			return includesGroupName || includesGroupState;
		});
});

const canResetOffset = (group: ConsumerGroup) => {
	return group.state !== 'Consuming' && group.watermarks[0] < group.watermarks[1];
};

const resetOffset = async (group: ConsumerGroup) => {
	if (!canResetOffset(group)) {
		return;
	}

	const confirmMessage = `Are you sure you want to commit the latest offsets?
Group: ${group.name}
Topic: ${topicName}
Partitions: All

You will be skipping ${group.watermarks[1] - group.watermarks[0]} messages`;
	const areYouSure = await confirm(confirmMessage, {title: 'Reset offsets'});
	if (!areYouSure) { return; }

	loader?.value?.show();
	try {
		await kafkaService.resetOffsets(group.name, topicName);
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();

	await fetchGroupsFromTopic();
};

const refreshEvent = (event: KeyboardEvent) => {
	if (event.ctrlKey && event.key === 'r') {
		fetchGroupsFromTopic();
	}
};
window.addEventListener('keydown', refreshEvent);
onBeforeUnmount(() => {
	window.removeEventListener('keydown', refreshEvent);
});
</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="mb-6 flex justify-between items-end">
			<h2 class="text-2xl mr-4 whitespace-nowrap overflow-hidden text-ellipsis" :title="topicName">
				{{ topicName }} groups
			</h2>
			<router-link title="Topic's Messages"
				class="whitespace-nowrap border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400 flex items-center"
				:to="`/topics/${topicName}/messages`">
				<i class="mr-2 bi-envelope cursor-pointer"></i>
				Messages
			</router-link>
		</div>
		<div class="flex mb-6 justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block mr-2 bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
			<button @click="fetchGroupsFromTopic()" 
				class="text-2xl bi-arrow-clockwise" type="button">
			</button>
		</div>
		<div class="h-full overflow-auto">
			<table class="table-auto w-full border-spacing-0 border-separate">
				<thead class="sticky top-0 bg-gray-800 z-10">
					<tr>
						<th class="border-l border-y border-white text-left px-4 py-2">NAME</th>
						<th class="border-y border-white px-4 py-2">LOW</th>
						<th class="border-y border-white px-4 py-2">HIGH</th>
						<th class="border-y border-white px-4 py-2">LAG</th>
						<th class="border-r border-y border-white text-right px-4 py-2">ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-800" v-for="group, key of filteredGroups" :key="key">
						<td :class="key !== filteredGroups.length - 1 ? 'border-b' : ''"
							class="border-white py-3 px-4 w-full relative">
							<div class="flex justify-center items-center">
								<div :title="group.state" class="rounded-full h-4 w-4 mr-2" :class="{
									'bg-green-600': group.state === 'Consuming',
									'bg-yellow-500': group.state === 'Disconnected',
									'bg-gray-500': group.state === 'Unconnected',
								}"></div>
								<span
									class="w-[calc(100%-theme(spacing.8))] overflow-hidden text-ellipsis whitespace-nowrap"
									:title="group.name">
									{{ group.name }}
								</span>
							</div>
						</td>
						<td :class="key !== filteredGroups.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4 text-center">
								{{ group.watermarks[0] }}
						</td>
						<td :class="key !== filteredGroups.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4 text-center">
							{{ group.watermarks[1] }}
						</td>
						<td :class="key !== filteredGroups.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4 text-center">
							<span :class="{
								'text-green-600': group.watermarks[0] === group.watermarks[1],
								'text-yellow-500': group.watermarks[0] < group.watermarks[1],
								'text-red-500': group.watermarks[0] > group.watermarks[1]
								}">
									{{ group.watermarks[1] - group.watermarks[0] }}
							</span>
						</td>
						<td :class="{
								'border-b': key !== filteredGroups.length - 1, 
								'text-gray-500': !canResetOffset(group)
							}" class="border-white py-3 px-4 text-right flex justify-center">
							<button title="Reset offset to latest"
								@click="resetOffset(group)" class="text-2xl bi-skip-forward">
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>