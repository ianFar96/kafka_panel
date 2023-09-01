<script setup lang="ts">
import { confirm, message } from '@tauri-apps/api/dialog';
import { computed, onActivated, onDeactivated, ref } from 'vue';
import CreateTopic from '../components/CreateTopic.vue';
import Dialog from '../components/Dialog.vue';
import SelectConnection from '../components/SelectConnection.vue';
import { useConnectionStore } from '../composables/connection';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import kafkaService from '../services/kafka';
import storageService from '../services/storage';
import { Connection } from '../types/connection';
import { ConsumerGroupState } from '../types/consumerGroup';
import { Topic } from '../types/topic';

await checkSettings('topics');

const connections = (await storageService.settings.get('CONNECTIONS') ?? []) as Connection[];

const loader = useLoader();

const connectionStore = useConnectionStore();

const topics = ref<Topic[]>([]);
const topicsState = ref<Record<string, ConsumerGroupState>>({});
const fetchTopics = async () => {
	topics.value = [];
	
	loader?.value?.show();
	try {
		topics.value = await kafkaService.listTopics();
		await startFetchTopicsState();
	} catch (error) {
		await message(`Error fetching topics: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fetchTopicStateInterval: any;
const startFetchTopicsState = async () => {
	stopFetchTopicState();
	fetchTopicStateInterval = setInterval(async () => {
		fetchTopicsState();
	}, 5000);
	await fetchTopicsState();
};
const stopFetchTopicState = () => {
	clearInterval(fetchTopicStateInterval);
};
const fetchTopicsState = async () => {
	try {
		topicsState.value = await kafkaService.getTopicsState();
	} catch (error) {
		console.error(`Error fetching topics state: ${error}`, { title: 'Error', type: 'error' });
	}
};

onDeactivated(() => {
	stopFetchTopicState();
	selectConnectionDialog?.value?.close();
});
onActivated(async () => {
	if (connectionStore.connection) {
		await fetchTopics();
	} else {
		selectConnectionDialog?.value?.open();
	}
});

const createTopicDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const createTopic = async (name: string, partitions?: number, replicationFactor?: number) => {
	if (!name) return;

	loader?.value?.show();
	try {
		await kafkaService.createTopic(name, partitions, replicationFactor);
	} catch (error) {
		await message(`Error creating topic: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();

	createTopicDialog.value?.close();

	await fetchTopics();
};

const removeTopic = async (topic: Topic) => {
	if (!await confirm('Are you sure you want to delete this topic? All messages will be lost', { title: 'Warning', type: 'warning' })) return;

	loader?.value?.show();
	try {
		await kafkaService.deleteTopic(topic.name);
	} catch (error) {
		await message(`Error removing topic: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();

	await fetchTopics();
};

const selectConnectionDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const setNewConnection = async (newConnection: Connection) => {
	// Clean slate
	topics.value = [];
	stopFetchTopicState();

	loader?.value?.show();
	try {
		// Set connection and make sure it works
		await connectionStore.setConnection(newConnection);
		topics.value = await kafkaService.listTopics();

		await startFetchTopicsState();
	} catch (error) {
		await message(`Error setting connection: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();

	selectConnectionDialog.value?.close();
};

const searchQuery = ref('');
const filteredTopics = computed(() => {
	if (!searchQuery.value) return topics.value;
	return topics.value
		.filter(topic => {
			const query = searchQuery.value.toLowerCase();
			const includesTopicName = topic.name.toLowerCase().includes(query);
			return includesTopicName;
		});
});

const refreshEvent = (event: KeyboardEvent) => {
	if (event.ctrlKey && event.key === 'r') {
		fetchTopics();
	}
};
onActivated(() => {
	window.addEventListener('keydown', refreshEvent);
});
onDeactivated(() => {
	window.removeEventListener('keydown', refreshEvent);
});
</script>

<template>
	<div class="flex flex-col h-full relative" v-if="connectionStore.connection">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" :title="connectionStore.connection.name">
				{{ connectionStore.connection.name }} topics
			</h2>
			<div class="flex">
				<button
					class="mr-4 border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500 whitespace-nowrap flex items-center"
					@click="createTopicDialog?.open()">
					<i class="bi bi-plus-lg mr-2 -ml-1"></i>
					New topic
				</button>
				<button
					class="border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400 whitespace-nowrap flex items-center"
					@click="selectConnectionDialog?.open()">
					<i class="bi bi-wifi mr-2"></i>
					Change connection
				</button>
			</div>
		</div>
		<div class="flex mb-6 justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block mr-2 bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
			<button type="button" @click="fetchTopics()"
				class="text-2xl bi-arrow-clockwise">
			</button>
		</div>
		<div class="h-full overflow-auto">
			<table class="table-auto w-full border-spacing-0 border-separate">
				<thead class="sticky top-0 bg-gray-800 z-10">
					<tr>
						<th class="border-l border-y border-white text-left px-4 py-2">NAME</th>
						<th class="border-y border-white px-4 py-2">PARTITIONS</th>
						<th class="border-r border-y border-white text-right px-4 py-2">ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-800" v-for="topic, key of filteredTopics" :key="key">
						<td :class="key !== filteredTopics.length - 1 ? 'border-b' : ''"
							class="border-white py-3 px-4 w-full relative">
							<div class="flex items-center">
								<div :title="topicsState[topic.name]" class="rounded-full h-4 w-4 mr-2" :class="{
									'bg-green-600': topicsState[topic.name] === 'Consuming',
									'bg-yellow-500': topicsState[topic.name] === 'Disconnected',
									'bg-gray-500': topicsState[topic.name] === 'Unconnected',
								}"></div>
								<span
									class="w-[calc(100%-theme(spacing.8))] overflow-hidden text-ellipsis whitespace-nowrap"
									:title="topic.name">
									{{ topic.name }}
								</span>
							</div>
						</td>
						<td :class="key !== filteredTopics.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4 text-center">
							{{ topic.partitions }}
						</td>
						<td :class="key !== filteredTopics.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4 text-right flex">
							<router-link title="Messages" class="mr-3" :to="`/topics/${topic.name}/messages`">
								<i class="text-2xl bi-envelope cursor-pointer transition-colors hover:text-orange-400"></i>
							</router-link>
							<router-link title="Consumer groups" class="mr-3" :to="`/topics/${topic.name}/groups`">
								<i class="text-2xl bi-people cursor-pointer transition-colors hover:text-orange-400"></i>
							</router-link>
							<button type="button" title="Delete topic" @click="removeTopic(topic)" 
								class="text-2xl bi-trash cursor-pointer transition-colors hover:text-red-500">
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
  <Dialog ref="createTopicDialog" size="s" :title="'Create topic'">
		<CreateTopic :createTopic="createTopic" />
	</Dialog>

  <Dialog ref="selectConnectionDialog" size="s" :title="'Choose Connection'" :closable="!!connectionStore.connection">
		<SelectConnection :connections="connections" :submit="setNewConnection" />
  </Dialog>
</template>
