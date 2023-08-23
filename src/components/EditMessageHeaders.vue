
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window';
import MonacoEditor from 'monaco-editor-vue3';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { messageToSendMessage } from '../services/utils';
import { ParsedHeaders } from '../types/message';

const props = defineProps<{
	submit: (headers: ParsedHeaders) => Promise<void>,
	submitButtonText: string,
	headers?: ParsedHeaders
}>();

const sendMessage = props.headers && messageToSendMessage({
	key: {},
	value: {},
	headers: props.headers
});
const headers = ref(sendMessage?.headers ?? null);

onMounted(() => {
	setMonacoEditorSizes();
});

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

const handleSubmit = async () => {
	await props.submit(headers.value);

	// Reset form
	headers.value = {};
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
	<form class="h-full w-full" @submit="handleSubmit()">
		<template v-if="headers">
			<div class="mb-4" v-for="key in Object.keys(headers)" :key="key">
				<label class="block mb-2">{{ key }}</label>
				<div class="h-full rounded-xl overflow-hidden">
					<MonacoEditor v-if="monacoEditorSizes" theme="vs-dark" :options="editorOptions" language="json"
						:width="monacoEditorSizes.width" :height="monacoEditorSizes.height" v-model:value="headers[key]">
					</MonacoEditor>
				</div>
			</div>
		</template>
		<div class="mt-8 flex justify-end flex-none">
			<button type="submit"
				class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
				{{ submitButtonText }}
			</button>
		</div>
	</form>
</template>