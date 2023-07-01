<script setup lang="ts">
import MonacoEditor from 'monaco-editor-vue3';
import db from '../services/database';
import { Setting } from '../types/settings';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { appWindow } from '@tauri-apps/api/window';

const settings = await db.settings.toArray();

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

const onChange = async (event: Event, setting: Setting) => {
	const value = (event.target as HTMLInputElement).value;
	await db.settings.put({ ...setting, value });
};
const onMonacoEditorChange = async (value: string, setting: Setting) => {
	await db.settings.put({ ...setting, value });
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
	<div ref="page" >
		<div class="mb-4" v-for="setting, key in settings" :key="key">
			<label class="mb-2 block text-lg">{{ setting.label }}</label>
			<div class="rounded-xl overflow-hidden" v-if="setting.type === 'json'">
				<template v-if="monacoEditorSizes">
					<MonacoEditor class="border-b border-gray-400 mb-1" theme="vs-dark" :options="editorOptions" language="json"
						:width="monacoEditorSizes.width" :height="monacoEditorSizes.height" 
						@change="onMonacoEditorChange($event, setting)" :value="setting.value">
					</MonacoEditor>
				</template>
			</div>
			<div v-else>
				<input :type="setting.type"
					class="text-sm block mb-1 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
					:value="setting.value" @change="onChange($event, setting)" />
			</div>
			<small class="text-xs text-gray-500">{{ setting.description }}</small>
		</div>
	</div>
</template>