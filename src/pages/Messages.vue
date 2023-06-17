<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { writeText } from '@tauri-apps/api/clipboard';
import { message } from '@tauri-apps/api/dialog';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import EditMessageDialog from '../components/EditMessageDialog.vue';
import EditTagsDialog from '../components/EditTagsDialog.vue';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import db from '../services/database';
import { KafkaManager } from '../services/kafka';
import { KafkaMessage } from '../types/message';
import { Setting, SettingKey } from '../types/settings';

type Message = {
	key: Record<string, unknown> | string
  value: Record<string, unknown> | string
  timestamp: number
  offset: number
  partition: number
	valueVisible: boolean
}

await checkSettings('topics');

const route = useRoute();

const settingKeys: SettingKey[] = ['MESSAGES'];
const settings = await db.settings.bulkGet(settingKeys) as Setting[];
const settingsMap: { [key: string]: Setting } = settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting }), {});

const kafka = new KafkaManager();

const topicName = route.params.topicName as string;

const loader = useLoader();

const selectedMessage = ref<Message>();

const kafkaMessageToMessage = (kafkaMessage: KafkaMessage): Message => {
	let key = kafkaMessage.key;
	try {
		key = JSON.parse(kafkaMessage.key);
	} catch (error) { }

	let value = kafkaMessage.value;
	try {
		value = JSON.parse(kafkaMessage.value);
	} catch (error) { }
	
	return {
		...kafkaMessage,
		key,
		value,
		valueVisible: false,
	};
};

const messageToKafkaMessage = (message: Message): KafkaMessage => {
	return {
		offset: message.offset,
		partition: message.offset,
		timestamp: message.timestamp,
		key: typeof message.key === 'object' ? JSON.stringify(message.key, null, 2) : message.key,
		value: typeof message.value === 'object' ? JSON.stringify(message.value, null, 2) : message.value,
	};
};

const messages = ref<Message[]>([]);
const fetchMessages = async () => {
	loader?.value?.show();
	try {
		const kafkaMessages = await kafka.getMessages(topicName, parseInt(settingsMap['MESSAGES'].value as string));
		messages.value = kafkaMessages.map(message => kafkaMessageToMessage(message));
	} catch (error) {
		await message(`Error fetching messages: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
await fetchMessages();

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
	if (!searchQuery.value) return messages.value;
	return messages.value
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

const editTagsDialog = ref<InstanceType<typeof EditTagsDialog> | null>(null); // Template ref
const chooseTags = (message: Message) => {
	selectedMessage.value = message;
	editTagsDialog.value?.openDialog();
};

const saveMessage = async (tags: string[]) => {
	await db.messages.add({
		key: typeof selectedMessage.value!.key === 'object' ?
			JSON.stringify(selectedMessage.value!.key) :
			selectedMessage.value!.key,
		value: typeof selectedMessage.value!.value === 'object' ?
			JSON.stringify(selectedMessage.value!.value) :
			selectedMessage.value!.value,
		tags
	});
};

const editMessageDialog = ref<InstanceType<typeof EditMessageDialog> | null>(null); // Template ref
const sendMessage = async (key: string, value: string) => {
	loader?.value?.show();
	try {
		await kafka.sendMessage(topicName, key, value);
	} catch (error) {
		await message(`Error sending the message: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();

	await fetchMessages();
};

const getDisplayDate = (dateMilis: number) => {
	const date = new Date(dateMilis);	
	const day = date.getDate().toString().padStart(2, '0');
	const month = date.getMonth().toString().padStart(2, '0');
	const fullyear = date.getFullYear();
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${day}/${month}/${fullyear} ${hours}:${minutes}:${seconds}`;
};

const refreshEvent = (event: KeyboardEvent) => {
	if (event.ctrlKey && event.key === 'r') {
		fetchMessages();
	}
};
window.addEventListener('keydown', refreshEvent);
onBeforeUnmount(() => {
	window.removeEventListener('keydown', refreshEvent);
});
</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="flex justify-between items-end mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" :title="topicName">
				{{ topicName }} messages
			</h2>
			<div class="flex">
				<router-link title="Topic's Consumer groups"
					class="whitespace-nowrap border border-white rounded py-1 px-4 hover:border-blue-500 transition-colors hover:text-blue-500 flex items-center mr-4"
					:to="`/topics/${topicName}/groups`">
					<i class="mr-2 bi-people cursor-pointer"></i>
					Groups
				</router-link>
				<button
					class="whitespace-nowrap border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500 flex items-center"
					@click="editMessageDialog?.openDialog()">
					<i class="mr-2 bi-send cursor-pointer"></i>
					Send message
				</button>
			</div>
		</div>

		<div class="mb-6 flex justify-between items-center">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search">
			<button type="button" @click="fetchMessages()"
				class="text-2xl bi-arrow-clockwise">
			</button>
		</div>

		<div class="flex justify-end mb-2">
			<span class="text-xs text-gray-400">
				{{ filteredMessages.length }}/{{ settingsMap['MESSAGES'].value }}
				<i class="bi-envelope ml-0.5"></i>
			</span>
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
						<button @click="copyToClipboard($event, JSON.stringify({key: message.key, value: message.value}, null, 2))"
							title="Copy JSON"
							class="text-xl leading-none bi-clipboard transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="chooseTags(message)"
							title="Save on storage"
							class="text-xl leading-none bi-database-add transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="editMessageDialog?.openDialog(messageToKafkaMessage(message))"
							title="Send again"
							class="text-xl leading-none bi-send transition-colors duration-300 cursor-pointer hover:text-green-500">
						</button>
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="JSON.stringify({key: message.key, value: message.value}, null, 2)" />
					</div>
				</div>
			</li>
		</ul>
  </div>
  <EditMessageDialog ref="editMessageDialog" :submit="sendMessage" :submit-button-text="'Send'"/>
  <EditTagsDialog ref="editTagsDialog" :submit="saveMessage" :submit-button-text="'Save'"/>
</template>
