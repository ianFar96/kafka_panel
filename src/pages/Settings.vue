<script setup lang="ts">
import { ref } from 'vue';
import CodeEditor from '../components/CodeEditor.vue';
import storageService from '../services/storage';
import { SettingKey } from '../types/settings';
import logger from '../services/logger';

const storageConnections = ref(await storageService.settings.get('CONNECTIONS'));

const onConnectionsChange = async (value: unknown, key: SettingKey) => {
	logger.info('Changing Connections setting...');
	storageConnections.value = value;
	await storageService.settings.save(value, key);
};

const storageNumberOfMessages = ref(await storageService.settings.get('MESSAGES'));

const onMessagesChange = async (event: Event, key: SettingKey) => {
	logger.info('Changing Messages setting...');
	const value = (event.target as HTMLInputElement).value;
	await storageService.settings.save(value, key);
};

const connectionsRef = ref<HTMLDivElement | null>(null); // Template ref
</script>

<template>
	<div>

		<!-- CONNECTIONS -->
		<div class="mb-4">
			<label class="mb-2 block text-lg">Connections</label>
			<div class="rounded-xl overflow-hidden h-[calc(100vh/2)]" ref="connectionsRef">
				<CodeEditor v-if="connectionsRef" :wrapper-ref="connectionsRef"
					@code-change="onConnectionsChange($event, 'CONNECTIONS')" :code="storageConnections">
				</CodeEditor>
			</div>
			<small class="text-xs text-gray-500 border-t border-gray-400 mt-1 pt-1 block">
				Check out the example <a class="text-orange-400" href="https://github.com/ianFar96/kafka_panel#settings">here</a>
			</small>
		</div>

		<!-- MESSAGES -->
		<div class="mb-4">
			<label class="mb-2 block text-lg">Number of messages</label>
			<input type="number"
				class="text-sm block mb-1 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
				v-model="storageNumberOfMessages" @change="onMessagesChange($event, 'MESSAGES')" />
			<small class="text-xs text-gray-500">
				Number of messages to display for each partition when subscribing to a topic. Ex. the last 20 messages
			</small>
		</div>
	</div>
</template>