<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { writeText } from '@tauri-apps/api/clipboard';
import { message } from '@tauri-apps/api/dialog';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Chip, { Tag } from '../components/Chip.vue';
import EditMessageStorageStepper from '../components/EditMessageStorageStepper.vue';
import SendStorageMessageStepper from '../components/SendStorageMessageStepper.vue';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import { randomColor } from '../services/chipColors';
import db from '../services/database';
import { Connection } from '../types/connection';
import { StorageMessage } from '../types/message';
import { Setting, SettingKey } from '../types/settings';
import StartAutosendStepper from '../components/StartAutosendStepper.vue';
import { useAutosendsStore } from '../composables/autosends';
import { pick } from 'ramda';

type Message = {
	id: number
	key: Record<string, unknown> | string
  value: Record<string, unknown> | string
	tags: Tag[]
	valueVisible: boolean
}

await checkSettings('messages-storage');

const router = useRouter();

const settingKeys: SettingKey[] = ['CONNECTIONS'];
const settings = await db.settings.bulkGet(settingKeys) as Setting[];
const settingsMap: { [key: string]: Setting } = settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting }), {});

const connections: Connection[] = JSON.parse(settingsMap['CONNECTIONS'].value);

if (connections.length <= 0) {
	await message('Please make sure you have at least one connection configured for Connections setting', { title: 'Error', type: 'error' });
	router.push('/settings');
}

const loader = useLoader();

const storeMessageToMessage = (storageMessage: StorageMessage): Message => {
	let key = storageMessage.key;
	try {
		key = JSON.parse(storageMessage.key);
	} catch (error) { }

	let value = storageMessage.value;
	try {
		value = JSON.parse(storageMessage.value);
	} catch (error) { }
	
	return {
		id: storageMessage.id!,
		key,
		value, 
		tags: storageMessage.tags.map(tag => ({
			name: tag,
			color: randomColor()
		})),
		valueVisible: false,
	};
};

const messageToStorageMessage = (message: Message): StorageMessage => {
	return {
		id: message.id,
		key: typeof message.key === 'object' ? JSON.stringify(message.key, null, 2) : message.key,
		value: typeof message.value === 'object' ? JSON.stringify(message.value, null, 2) : message.value,
		tags: message.tags.map(tag => tag.name),
	};
};

const messages = ref<Message[]>([]);
const fetchMessages = async () => {
	loader?.value?.show();
	try {
		const storageMessages = await db.messages.toArray();
		messages.value = storageMessages.map(message => storeMessageToMessage(message));
	} catch (error) {
		await message(`Error fetching messages: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
await fetchMessages();

const deleteMessage = async (storageMessage: Message) => {
	try {
		await db.messages.delete(storageMessage.id!);
		await fetchMessages();
	} catch (error) {
		await message(`Could not delete message from storage: ${error}`, { title: 'Error', type: 'error' });
	}
};

const saveMessage = async (message: StorageMessage) => {
	await db.messages.update(message.id!, {
		key: message.key,
		value: message.value,
		tags: message.tags.slice(),
	});

	await fetchMessages();
};

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
			const includesTag = message.tags.some(tag => tag.name.toLowerCase().includes(query));
			return includesTag;
		});
});

const autosendStore = useAutosendsStore();

const sendStorageMessageStepper = ref<InstanceType<typeof SendStorageMessageStepper> | null>(null); // Template ref
const editMessageStorageStepper = ref<InstanceType<typeof EditMessageStorageStepper> | null>(null); // Template ref
const startAutosendStepper = ref<InstanceType<typeof StartAutosendStepper> | null>(null); // Template ref
</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" title="Messages Storage">
				Messages Storage
			</h2>
		</div>

		<div class="mb-6">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search by tags">
		</div>

		<ul class="h-full overflow-auto">
			<li v-for="message, index in filteredMessages" :key="index" :class="{'border-b': index !== filteredMessages.length - 1}"
				class="border-white overflow-hidden">
				<div class="flex justify-between items-center w-full cursor-pointer pt-4 pb-2"
					@click="message.valueVisible = !message.valueVisible">
					<div>
						<ul class="flex flex-wrap">
							<li v-for="tag in message.tags" :key="tag.name">
								<Chip :chip-color="tag.color" class="mr-2 mb-2 cursor-pointer flex items-center">
									{{ tag.name }}
								</Chip>
							</li>
						</ul>
					</div>
					<i class="text-xl leading-none"
						:class="{'bi-chevron-up': message.valueVisible, 'bi-chevron-down': !message.valueVisible}"></i>
				</div>

				<div v-if="message.valueVisible" class="mb-4 relative">
					<div class="absolute top-4 right-4">
						<button @click="editMessageStorageStepper?.openDialog(messageToStorageMessage(message))"
							title="Edit tags and message"
							class="text-xl translate-y-px bi-pencil-square transition-colors duration-300 cursor-pointer mr-3 hover:text-orange-400">
						</button>
						<button @click="deleteMessage(message)"
							title="Delete message"
							class="text-2xl translate-y-[3px] bi-trash transition-colors duration-300 cursor-pointer mr-3 hover:text-red-500">
						</button>
						<button @click="copyToClipboard($event, JSON.stringify({key: message.key, value: message.value}, null, 2))"
							title="Copy JSON"
							class="text-xl bi-clipboard transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="startAutosendStepper?.openDialog(connections, messageToStorageMessage(message))"
							title="Start autosend"
							class="text-xl bi-repeat transition-colors duration-300 cursor-pointer hover:text-orange-400 mr-3">
						</button>
						<button @click="sendStorageMessageStepper?.openDialog(connections, messageToStorageMessage(message))"
							title="Send again"
							class="text-xl bi-send transition-colors duration-300 cursor-pointer hover:text-green-500">
						</button>
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="JSON.stringify({key: message.key, value: message.value}, null, 2)" />
					</div>
				</div>
			</li>
		</ul>
  </div>

	<EditMessageStorageStepper ref="editMessageStorageStepper" :submit="saveMessage" />
	<SendStorageMessageStepper ref="sendStorageMessageStepper" />
	<StartAutosendStepper ref="startAutosendStepper" :submit="autosendStore.startAutosend" />
</template>
