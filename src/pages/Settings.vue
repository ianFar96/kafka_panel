<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window';
import MonacoEditor from 'monaco-editor-vue3';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import storageService from '../services/storage';
import { SettingKey } from '../types/settings';

const storageConnections = ref(await storageService.settings.get('CONNECTIONS'));
const storageConnectionsStringified = computed(() => {	
	if (typeof storageConnections.value === 'object' ) {
		return JSON.stringify(storageConnections.value, null ,2);
	}
	return storageConnections.value;
});

const onConnectionsChange = async (value: string, key: SettingKey) => {
	let json: unknown = value;
	// eslint-disable-next-line no-empty
	try { json = JSON.parse(value); } catch (error) {}

	storageConnections.value = json;
	await storageService.settings.save(json, key);
};

const storageNumberOfMessages = ref(await storageService.settings.get('MESSAGES'));

const onMessagesChange = async (event: Event, key: SettingKey) => {
	const value = (event.target as HTMLInputElement).value;
	await storageService.settings.save(value, key);
};

const editorOptions = {
	colorDecorators: true,
	lineHeight: 24,
	tabSize: 2,
	fontSize: 16,
	lineNumbers: 'off',
	lineDecorationsWidth: 5,
	minimap: {
		enabled: false
	},
	overviewRulerLanes: 0,
	scrollbar: {
		vertical: 'hidden',
		horizontal: 'hidden',
	},
	folding: false
};

type Sizes = {
	width: number
  height: number
}
let monacoEditorSizes = ref<Sizes | undefined>();

const page = ref<HTMLDivElement | null>(null); // Template ref
const setMonacoEditorSizes = () => {
	monacoEditorSizes.value = undefined;
	nextTick(() => {
		monacoEditorSizes.value = {
			height: 300,
			width: (page.value?.clientWidth || 300),
		};
	});
};
onMounted(() =>  {
	setMonacoEditorSizes();
});

const unlisten = await appWindow.onResized(() => {
	setMonacoEditorSizes();
});

onBeforeUnmount(() => {
	unlisten();
});
</script>

<template>
	<div ref="page">

		<!-- CONNECTIONS -->
		<div class="mb-4">
			<label class="mb-2 block text-lg">Connections</label>
			<div class="rounded-xl overflow-hidden">
				<template v-if="monacoEditorSizes">
					<MonacoEditor class="border-b border-gray-400 mb-1" theme="vs-dark" :options="editorOptions" language="json"
						:width="monacoEditorSizes.width" :height="monacoEditorSizes.height" 
						@change="onConnectionsChange($event, 'CONNECTIONS')" :value="storageConnectionsStringified">
					</MonacoEditor>
				</template>
			</div>
			<small class="text-xs text-gray-500">
				Check out the example <a href="https://github.com/ianFar96/kafka_panel#settings">here</a>
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