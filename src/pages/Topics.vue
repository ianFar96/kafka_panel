<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue';
import Button from '../components/Button.vue';
import CreateTopic from '../components/CreateTopic.vue';
import Dialog from '../components/Dialog.vue';
import SelectConnection from '../components/SelectConnection.vue';
import { useConnectionStore } from '../composables/connection';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import logger from '../services/logger';
import storageService from '../services/storage';
import { Connection } from '../types/connection';
import { ConsumerGroupState } from '../types/consumerGroup';
import { Topic } from '../types/topic';
import { KafkaService } from '../services/kafka';
import { Subscription } from 'rxjs';
import { useConfirmDialog } from '../composables/confirmDialog';
import { useAlertDialog } from '../composables/alertDialog';

await checkSettings('topics');

const loader = useLoader();

const connections = ref<Connection[]>([]);
const connectionStore = useConnectionStore();

const alert = useAlertDialog();

const fetchTopics = () => {
	return new Promise((resolve, reject) => {
		fetchTopicsList().then(resolve).catch(reject);
		fetchTopicsState();
		fetchTopicsWatermark();
	});
};

const kafkaService = new KafkaService();

const topics = ref<Topic[]>([]);
const fetchTopicsList = async () => {
	topics.value = [];
	loader?.value?.show();
	try {
		logger.info('Fetching topics...', {kafkaService});
		topics.value = await kafkaService.listTopics();
	} catch (error) {
		const errorMessage = `Error fetching topics: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
};

const topicsState = ref<Record<string, ConsumerGroupState>>({});
const fetchTopicsState = async () => {
	topicsState.value = {};
	try {
		logger.debug('Fetching topics state...', {kafkaService});
		topicsState.value = await kafkaService.getTopicsState();
	} catch (error) {
		const errorMessage = `Error fetching topics state: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
};

const topicsWatermark = ref<Record<string, number>>({});
let watermarksSubscription: Subscription | undefined;
const fetchTopicsWatermark = async () => {
	// Cancel previous watermark fetching
	watermarksSubscription?.unsubscribe();

	topicsWatermark.value = {};

	const watermarksObservable = await kafkaService.getTopicsWatermark();
	logger.debug('Listening for watermarks...', {kafkaService});

	let windowingTimeout: unknown;
	const watermarksAcc: Record<string, number> = {};
	watermarksSubscription = watermarksObservable.subscribe({
		next: async topicWatermark => {
			logger.trace('Received watermark', {kafkaService});
			watermarksAcc[topicWatermark.topic] = topicWatermark.watermark;

			if (!windowingTimeout) {
				windowingTimeout = setTimeout(() => {
					logger.trace('Displaying watermarks', {kafkaService});

					const newWatermarksState = Object.assign(topicsWatermark.value, watermarksAcc);
					topicsWatermark.value = {...newWatermarksState};

					windowingTimeout = undefined;
				}, 1000);
			}
		},
		error: async error => {
			const errorMessage = `Error fetching watermarks: ${error}`;
			logger.error(errorMessage, {kafkaService});
			alert?.value?.show({
				title: 'Error',
				type: 'error',
				description: errorMessage
			});
		},
		complete: () => {
			logger.debug('Finished listening for watermarks', {kafkaService});
		}
	});
};

onDeactivated(() => {
	if (!watermarksSubscription?.closed) {
		logger.debug('Stopping to listen for watermarks...', {kafkaService});
		watermarksSubscription?.unsubscribe();
	}

	selectConnectionDialog?.value?.close();
});
onActivated(async () => {
	connections.value = (await storageService.settings.get('CONNECTIONS') ?? []) as Connection[];

	if (connectionStore.connection) {
		await fetchTopics();
	}
});

const createTopicDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const createTopic = async (name: string, partitions?: number, replicationFactor?: number) => {
	if (!name) return;

	loader?.value?.show();
	try {
		logger.info(`Creating topic ${name}...`, {kafkaService});
		await kafkaService.createTopic(name, partitions, replicationFactor);
	} catch (error) {
		const errorMessage = `Error creating topic: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();

	createTopicDialog.value?.close();

	await fetchTopics();
};

const confirmDialog = useConfirmDialog();
const removeTopic = async (topic: Topic) => {
	const isConfirmed = await confirmDialog?.value?.ask({
		description: 'Are you sure you want to delete this topic? All messages will be lost',
		title: 'Warning'
	});
	if (!isConfirmed) return;

	loader?.value?.show();
	try {
		logger.info(`Deleting topic ${topic.name}...`, {kafkaService});
		await kafkaService.deleteTopic(topic.name);
	} catch (error) {
		const errorMessage = `Error removing topic: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();

	await fetchTopics();
};

const selectConnectionDialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const setNewConnection = async (newConnection: Connection) => {
	loader?.value?.show();
	try {
		logger.info(`Setting connection ${newConnection.name}...`, {kafkaService});
		await connectionStore.setConnection(newConnection);
		selectConnectionDialog.value?.close();
		await fetchTopics();
	} catch (error) {
		const errorMessage = `Error setting connection: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
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
				<Button class="mr-4" color="green" @click="createTopicDialog?.open()">
					<i class="bi bi-plus-lg mr-2 -ml-1"></i>
					New topic
				</Button>
				<Button color="orange" @click="selectConnectionDialog?.open()">
					<i class="bi bi-wifi mr-2"></i>
					Change connection
				</Button>
			</div>
		</div>
		<div class="flex mb-6 justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block mr-2 bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
			<button type="button" @click="fetchTopics()"
				title="Refresh list" class="text-2xl bi-arrow-clockwise">
			</button>
		</div>
		<div class="h-full overflow-auto">
			<table class="table-auto w-full border-spacing-0 border-separate">
				<thead class="sticky top-0 bg-gray-800 z-10">
					<tr>
						<th class="border-l border-y border-white text-left px-4 py-2">NAME</th>
						<th class="border-y border-white px-4 py-2 whitespace-nowrap">HIGH WATERMARK</th>
						<th class="border-y border-white px-4 py-2">PARTITIONS</th>
						<th class="border-r border-y border-white text-right px-4 py-2">ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-800" v-for="topic, key of filteredTopics" :key="key">
						<td :class="key !== filteredTopics.length - 1 ? 'border-b' : ''"
							class="border-white py-3 px-4 w-full relative">
							<div class="flex items-center">
								<div v-if="topic.name in topicsState" :title="topicsState[topic.name]" class="rounded-full h-4 w-4 mr-2" :class="{
									'bg-green-600': topicsState[topic.name] === 'Consuming',
									'bg-yellow-500': topicsState[topic.name] === 'Disconnected',
									'bg-gray-500': topicsState[topic.name] === 'Unconnected',
								}"></div>
								<img v-else class="h-4 w-4 mr-2" src="../assets/loader.svg" />
								<span
									class="w-[calc(100%-theme(spacing.8))] overflow-hidden text-ellipsis whitespace-nowrap"
									:title="topic.name">
									{{ topic.name }}
								</span>
							</div>

						</td>
						<td :class="key !== filteredTopics.length - 1 ? 'border-b' : ''" class="border-white py-3 px-4">
							<div class="flex justify-center w-full">
								<span v-if="topic.name in topicsWatermark">
									{{ topicsWatermark[topic.name] }}
								</span>
								<img v-else class="h-4 w-4 mr-2" src="../assets/loader.svg" />
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
	<div class="flex justify-center items-center h-full" v-else>
		<div class="rounded bg-gray-800 p-6 w-[500px]">
			<h3 class="mb-4 text-xl">Choose Connection</h3>
			<SelectConnection :connections="connections" @submit="setNewConnection" />
		</div>
	</div>

  <Dialog ref="createTopicDialog" size="s" :title="'Create topic'">
		<CreateTopic :createTopic="createTopic" />
	</Dialog>

  <Dialog ref="selectConnectionDialog" size="s" :title="'Choose Connection'" :closable="!!connectionStore.connection">
		<SelectConnection :selected-connection="connectionStore.connection?.name"
			:connections="connections" @submit="setNewConnection" />
  </Dialog>
</template>
