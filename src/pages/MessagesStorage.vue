<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { writeText } from '@tauri-apps/api/clipboard';
import { message } from '@tauri-apps/api/dialog';
import { omit } from 'ramda';
import { computed, ref } from 'vue';
import Chip, { Tag } from '../components/Chip.vue';
import EditMessageStorageStepper from '../components/EditMessageStorageStepper.vue';
import SendStorageMessageStepper from '../components/SendStorageMessageStepper.vue';
import StartAutosendStepper from '../components/StartAutosendStepper.vue';
import { useAutosendsStore } from '../composables/autosends';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import { getRandomColor } from '../services/chipColors';
import storageService from '../services/storage';
import { Connection } from '../types/connection';
import { StorageMessage, StorageMessageWithId } from '../types/message';
import { stringifyMessage } from '../services/utils';

type DisplayMessage = Omit<StorageMessageWithId, 'tags'> & {
	tags: Tag[]
	valueVisible: boolean
}

await checkSettings('messages-storage');

const connections = await storageService.settings.get('CONNECTIONS') as Connection[];

const loader = useLoader();

const storeMessageToDisplayMessage = (message: StorageMessageWithId): DisplayMessage => ({
	...message,
	tags: message.tags.map(name => ({
		name,
		color: getRandomColor()
	}) as Tag),
	valueVisible: false
});

const displayMessageToStoreMessage = (message: DisplayMessage): StorageMessageWithId => ({
	...omit(['valueVisible'], message),
	tags: message.tags.map(tag => tag.name)
});

const messages = ref<DisplayMessage[]>([]);
const fetchMessages = async () => {
	loader?.value?.show();
	try {
		const storageMessages = await storageService.messages.getAll();

		messages.value = Object.entries(storageMessages).map(([id, message]) => storeMessageToDisplayMessage({id, ...message}));
	} catch (error) {
		await message(`Error fetching messages: ${error}`, { title: 'Error', type: 'error' });
	}
	loader?.value?.hide();
};
await fetchMessages();

const deleteMessage = async (storageMessage: DisplayMessage) => {
	try {
		await storageService.messages.delete(storageMessage.id);
		await fetchMessages();
	} catch (error) {
		await message(`Could not delete message from storage: ${error}`, { title: 'Error', type: 'error' });
	}
};

const saveMessage = async (message: StorageMessage) => {
	const messageWithoutId = omit(['id'], message);
	await storageService.messages.save(messageWithoutId, message.id);
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
						<button @click="editMessageStorageStepper?.openDialog(displayMessageToStoreMessage(message))"
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
						<button @click="startAutosendStepper?.openDialog(connections, message)"
							title="Start autosend"
							class="text-xl bi-repeat transition-colors duration-300 cursor-pointer hover:text-orange-400 mr-3">
						</button>
						<button @click="sendStorageMessageStepper?.openDialog(connections, message)"
							title="Send again"
							class="text-xl bi-send transition-colors duration-300 cursor-pointer hover:text-green-500">
						</button>
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="stringifyMessage(message)" />
					</div>
				</div>
			</li>
		</ul>
  </div>

	<EditMessageStorageStepper ref="editMessageStorageStepper" @submit="saveMessage" />
	<SendStorageMessageStepper ref="sendStorageMessageStepper" />
	<StartAutosendStepper ref="startAutosendStepper" @submit="autosendStore.startAutosend" />
</template>
