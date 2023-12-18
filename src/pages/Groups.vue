<script setup lang="ts">
import { confirm } from '@tauri-apps/api/dialog';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import { ConsumerGroup } from '../types/consumerGroup';
import logger from '../services/logger';
import { KafkaService } from '../services/kafka';
import { useConfirmDialog } from '../composables/confirmDialog';
import { useAlertDialog } from '../composables/alertDialog';

await checkSettings('groups');

const route = useRoute();

const topicName = route.params.topicName as string;

const loader = useLoader();

const groups = ref<ConsumerGroup[]>([]);

const confirmDialog = useConfirmDialog();

const kafkaService = new KafkaService();

const alert = useAlertDialog();

const fetchGroupsFromTopic = async () => {
	loader?.value?.show();
	try {
		logger.info(`Fetching groups from topic ${topicName}...`);
		groups.value = await kafkaService.listGroupsFromTopic(topicName);
	} catch (error) {
		const errorMessage = `Error getting groups: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
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

const canSeekEarliestOffsets = (group: ConsumerGroup) => {
	return group.state !== 'Consuming' && group.watermarks[0] > 0;
};

const seekEarliestOffsets = async (group: ConsumerGroup) => {
	if (!canSeekEarliestOffsets(group)) {
		return;
	}

	const areYouSure = await confirmDialog?.value?.ask({
		description: `Are you sure you want to seek the earliest offsets?

Group: ${group.name}
Topic: ${topicName}
Partitions: All`,
		title: 'Seek earliest offsets'
	});
	if (!areYouSure) { return; }

	loader?.value?.show();
	try {
		logger.info(`Seeking earliest offsets for topic ${topicName} and group ${group.name}...`);
		await kafkaService.seekEarliestOffsets(group.name, topicName);
	} catch (error) {
		const errorMessage = `Error Seeking earliest offsets: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();

	await fetchGroupsFromTopic();
};

const canCommitLatestOffsets = (group: ConsumerGroup) => {
	return group.state !== 'Consuming' && group.watermarks[0] < group.watermarks[1];
};

const commitLatestOffsets = async (group: ConsumerGroup) => {
	if (!canCommitLatestOffsets(group)) {
		return;
	}

	const areYouSure = await confirmDialog?.value?.ask({
		description: `Are you sure you want to commit the latest offsets?

Group: ${group.name}
Topic: ${topicName}
Partitions: All

You will be skipping ${group.watermarks[1] - group.watermarks[0]} messages`,
		title: 'Commit latest offsets'
	});
	if (!areYouSure) { return; }

	loader?.value?.show();
	try {
		logger.info(`Committing latests offsets for topic ${topicName} and group ${group.name}...`);
		await kafkaService.commitLatestOffsets(group.name, topicName);
	} catch (error) {
		const errorMessage = `Error Committing latests offsets: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();

	await fetchGroupsFromTopic();
};

const deleteGroup = async (group: ConsumerGroup) => {
	const areYouSure = await confirmDialog?.value?.ask({
		description: 'Are you sure you want to delete the consumer group?',
		title: 'Delete consumer group'
	});
	if (!areYouSure) { return; }

	loader?.value?.show();
	try {
		logger.info(`Deleting consumer group ${group.name}...`);
		await kafkaService.deleteGroup(group.name);
	} catch (error) {
		const errorMessage = `Error deleting consumer group: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
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
			<button type="button" @click="fetchGroupsFromTopic()"
				title="Refresh list" class="text-2xl bi-arrow-clockwise" >
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
						<th class="border-r border-y border-white px-4 py-2">ACTIONS</th>
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
						<td :class="{'border-b': key !== filteredGroups.length - 1}"
							class="border-white py-3 px-4 flex justify-center">
							<button title="Seek earliest offsets"
								@click="seekEarliestOffsets(group)" class="text-2xl bi-skip-backward mr-3"
								:class="{'text-gray-500': !canSeekEarliestOffsets(group)}">
							</button>
							<button title="Commit latest offsets"
								@click="commitLatestOffsets(group)" class="text-2xl bi-skip-forward mr-3"
								:class="{'text-gray-500': !canCommitLatestOffsets(group)}">
							</button>
							<button title="Delete consumer group"
								@click="deleteGroup(group)" class="text-2xl bi-trash transition-colors duration-300 hover:text-red-500">
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>