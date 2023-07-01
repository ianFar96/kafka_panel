
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window';
import MonacoEditor from 'monaco-editor-vue3';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { SendMessage } from '../types/message';

const props = defineProps<{
	submit: (key: string, value: string) => Promise<void>,
	submitButtonText: string,
	message?: SendMessage
}>();

const key = ref<string>(props.message?.key || '');
const value = ref<string>(props.message?.value || '');
	
onMounted(() => {
	setMonacoEditorSizes();
});

const editorOptions = {
	colorDecorators: true,
	lineHeight: 24,
	tabSize: 2,
	lineNumbers: 'off',
	lineDecorationsWidth: 0,
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

const handleSubmit = async () => {
	if (!key.value || !value.value) return;

	await props.submit(key.value, value.value);

	// Reset form
	key.value = '';
	value.value = '';
};

type Sizes = {
  width: number
  height: number
}
let monacoEditorSizes = ref<Sizes | undefined>();

// We only need one of the slots since they are the same
const valueSlotRef = ref<HTMLElement | null>(null);

const setMonacoEditorSizes = () => {
	monacoEditorSizes.value = undefined;

	nextTick(() => {
		monacoEditorSizes.value = {
			// TODO: improve editor sizes, they are not good enough
			height: (valueSlotRef.value?.clientHeight || 250),
			width: (valueSlotRef.value?.clientWidth || 500),
		};
	});
};

const unlisten = await appWindow.onResized(() => {
	setMonacoEditorSizes();
});

onBeforeUnmount(() => {
	unlisten();
});

</script>

<template>
	<form class="h-full flex flex-col" @submit="handleSubmit()">
		<div class="flex h-full">
			<div class="flex flex-col w-full">
				<label>Key</label>
				<div class="h-full">
					<MonacoEditor v-if="monacoEditorSizes" theme="vs-dark" :options="editorOptions" language="json"
						:width="monacoEditorSizes.width" :height="monacoEditorSizes.height" v-model:value="key">
					</MonacoEditor>
				</div>
			</div>
			<div class="h-full bg-white w-px mx-4 shrink-0"></div>
			<div class="flex flex-col w-full">
				<label>Value</label>
				<div class="h-full" ref="valueSlotRef">
					<MonacoEditor v-if="monacoEditorSizes" theme="vs-dark" :options="editorOptions" language="json"
						:width="monacoEditorSizes.width" :height="monacoEditorSizes.height" v-model:value="value">
					</MonacoEditor>
				</div>
			</div>
		</div>
		<div class="mt-8 flex justify-end flex-none">
			<button type="submit"
				class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
				{{ submitButtonText }}
			</button>
		</div>
	</form>
</template>