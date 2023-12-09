<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { writeText } from '@tauri-apps/api/clipboard';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import SendMessageStepper from '../components/SendMessageStepper.vue';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import storageService from '../services/storage';
import { Message, MessageContent, StorageMessage } from '../types/message';
import { DateTime } from 'luxon';
import { stringifyMessage } from '../services/utils';
import EditMessageStorageStepper from '../components/EditMessageStorageStepper.vue';
import Button from '../components/Button.vue';
import logger from '../services/logger';
import { KafkaService, AsyncSubject } from '../services/kafka';
import { useAlertDialog } from '../composables/alertDialog';

type DisplayMessage = Message & {
	valueVisible: boolean
}

await checkSettings('messages');

const route = useRoute();

const numberOfMessages = await storageService.settings.get('MESSAGES') as number;

const topicName = route.params.topicName as string;

const loader = useLoader();

const kafkaService = new KafkaService();

const alert = useAlertDialog();

const displayMessages = ref<DisplayMessage[]>([]);
const status = ref<'starting' | 'started' | 'stopping' | 'stopped'>('stopped');
let listenMessagesHandler: AsyncSubject<Message> | undefined;
const startListenMessages = async () => {
	status.value = 'starting';
	displayMessages.value = [];

	logger.info('Listening for messages...', {kafkaService});
	listenMessagesHandler = await kafkaService.listenMessages(topicName, numberOfMessages);

	let windowingTimeout: unknown;
	const messagesToDisplay: DisplayMessage[] = [];
	listenMessagesHandler.subscribe({
		next: kafkaMessage => {
			logger.trace('Received message', {kafkaService});

			messagesToDisplay.push({
				...kafkaMessage,
				valueVisible: false
			});

			if (!windowingTimeout) {
				windowingTimeout = setTimeout(() => {
					logger.trace('Displaying messages', {kafkaService});

					// To avoid going from stopping to started while receiving the last message
					if (status.value === 'starting') {
						status.value = 'started';
					}

					// Prepend the previous messages
					messagesToDisplay.unshift(...displayMessages.value);
					// Sort them with the new ones by timestamp
					messagesToDisplay.sort((a,b) => a.timestamp < b.timestamp ? 1 : -1);
					// To cut the oldest ones out
					displayMessages.value = messagesToDisplay.splice(0, numberOfMessages);

					windowingTimeout = undefined;
				}, 1000);
			}
		},
		error: async error => {
			status.value = 'stopped';
			const errorMessage = `Error fetching messages: ${error}`;
			logger.error(errorMessage, {kafkaService});
			alert?.value?.show({
				title: 'Error',
				type: 'error',
				description: errorMessage
			});
			clearTimeout(windowingTimeout as string);
		},
		complete: () => {
			status.value = 'stopped';
			logger.debug('Stopped listening for messages', {kafkaService});
			clearTimeout(windowingTimeout as string);
		}
	});
};
startListenMessages();

const stop = async () => {
	status.value = 'stopping';
	logger.debug('Stopping to listen for messages...', {kafkaService});
	await listenMessagesHandler?.unsubscribe();
};

onBeforeUnmount(async () => {
	loader?.value?.show();
	await stop();
	loader?.value?.hide();
});

const copyToClipboard = async (event: MouseEvent, text: string) => {
	event.preventDefault();
	event.stopPropagation();

	const copyToClipboard = writeText ?? navigator.clipboard.writeText;
	await copyToClipboard(text);

	const target = event.target as HTMLElement;
	target.classList.add('text-green-500');
	setTimeout(() => {
		target.classList.remove('text-green-500');
	}, 1000);
};

const searchQuery = ref('');

const filteredMessages = computed(() => {
	if (!searchQuery.value) return displayMessages.value;
	return displayMessages.value
		.filter(message => {
			const query = searchQuery.value.toLowerCase();

			const stringifiedKey = typeof message.key === 'string' ? message.key : JSON.stringify(message.key);
			const includesKey = stringifiedKey.toLowerCase().includes(query);

			const stringifiedValue = typeof message.value === 'string' ? message.value : JSON.stringify(message.value);
			const includesValue = stringifiedValue.toLowerCase().includes(query);

			const includesTimestamp = new Date(message.timestamp).toString().toLowerCase().includes(query);

			return includesKey || includesValue || includesTimestamp;
		});
});

const sendMessageStepper = ref<InstanceType<typeof SendMessageStepper> | null>(null); // Template ref
const sendMessage = async (messageContent: MessageContent) => {
	loader?.value?.show();
	try {
		logger.info(`Seding message to ${topicName}...`, {kafkaService});
		await kafkaService.sendMessage(topicName, messageContent);
		sendMessageStepper.value?.closeDialog();
	} catch (error) {
		const errorMessage = `Error sending the message: ${error}`;
		logger.error(errorMessage, {kafkaService});
		alert?.value?.show({
			title: 'Error',
			type: 'error',
			description: errorMessage
		});
	}
	loader?.value?.hide();
};

const editMessageStorageStepper = ref<InstanceType<typeof EditMessageStorageStepper> | null>(null); // Template ref
const editStorageMessage = (message: MessageContent) => {
	const storageMessage: StorageMessage = { ...message, tags: [] };
	editMessageStorageStepper.value?.openDialog(storageMessage);
};
const saveMessageInStorage = async (message: StorageMessage) => {
	await storageService.messages.save(message);
	editMessageStorageStepper.value?.closeDialog();
};

const getDisplayDate = (dateMilis: number) => {
	const dateTime = DateTime.fromMillis(dateMilis);
	return dateTime.toFormat('dd/LL/yyyy HH:mm:ss');
};
</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="flex justify-between items-end mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" :title="topicName">
				{{ topicName }} messages
			</h2>
			<div class="flex">
				<router-link title="Topic's Consumer groups"
					class="whitespace-nowrap border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400 flex items-center mr-4"
					:to="`/topics/${topicName}/groups`">
					<i class="mr-2 bi-people cursor-pointer"></i>
					Groups
				</router-link>
				<Button @click="sendMessageStepper?.openDialog()" color="green">
					<i class="mr-2 bi-send cursor-pointer"></i>
					Send message
				</Button>
			</div>
		</div>

		<div class="mb-6 flex justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
			<div class="flex items-center">
				<span class="text-lg mr-4" title="Number of messages">
					{{ filteredMessages.length }}
					<i class="bi-envelope ml-0.5"></i>
				</span>
				<button v-if="status === 'stopped'" type="button" @click="startListenMessages()"
					class="text-2xl bi-play-circle text-green-500" title="Start fetching">
				</button>
				<i v-if="status === 'starting' || status === 'stopping'" class="bi-arrow-clockwise text-2xl animate-spin"
					:title="status === 'starting' ? 'Starting' : 'Stopping'"></i>
				<button v-if="status === 'started'" type="button" @click="stop()"
					class="text-2xl bi-stop-circle animate-pulse text-red-500" title="Stop fetching" >
				</button>
			</div>
		</div>

		<ul class="h-full overflow-auto">
			<li v-for="message, index in filteredMessages" :key="index" :class="{'border-b': index !== filteredMessages.length - 1}"
				class="border-white overflow-hidden">
				<div class="flex justify-between items-center w-full cursor-pointer py-4"
					@click="message.valueVisible = !message.valueVisible">
					<div>
						<span class="text-sm mr-4">
							<i class="bi bi-calendar"></i>
							{{ getDisplayDate(message.timestamp) }}
						</span>
						<span class="text-sm mr-4" title="Offset">
							<i class="bi bi-1-square"></i>
							{{ message.offset }}
						</span>
						<span class="text-sm" title="Partition">
							<i class="bi bi-pie-chart"></i>
							{{ message.partition }}
						</span>
					</div>
					<i class="text-xl leading-none"
						:class="{'bi-chevron-up': message.valueVisible, 'bi-chevron-down': !message.valueVisible}"></i>
				</div>

				<div v-if="message.valueVisible" class="mb-4 relative">
					<div class="absolute top-4 right-4">
						<button @click="copyToClipboard($event, stringifyMessage(message))"
							title="Copy JSON"
							class="text-xl leading-none bi-clipboard transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="editStorageMessage(message)"
							title="Save in storage"
							class="text-xl leading-none bi-database-add transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="sendMessageStepper?.openDialog(message)"
							title="Send again"
							class="text-xl leading-none bi-send transition-colors duration-300 cursor-pointer hover:text-green-500">
						</button>
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="stringifyMessage(message)" />
					</div>
				</div>
			</li>
		</ul>
  </div>

	<SendMessageStepper ref="sendMessageStepper" @submit="sendMessage"/>
	<EditMessageStorageStepper ref="editMessageStorageStepper" @submit="saveMessageInStorage" />
</template>
