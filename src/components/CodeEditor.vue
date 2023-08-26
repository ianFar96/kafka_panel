<script lang="ts" setup>
import * as monaco from 'monaco-editor';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { tryJsonParse } from '../services/utils';

const props = defineProps<{
	code?: unknown,

	// Used to calculate the height and width to fit the wrapper's dimensions
	wrapperRef: HTMLElement
}>();

const emit = defineEmits<{
  (e: 'codeChange', code: unknown): Promise<void> | void
}>();

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

let code = '';
if (typeof props.code !== 'string') {
	code = JSON.stringify(props.code, null, 2);
} else {
	code = props.code as string;
}
let sizes: monaco.editor.IDimension;
const setMonacoEditorSizes = () => {
	if (editor) {
		code = editor.getValue();
		editor.dispose();
	}

	// Unfortunately nextTick doesn't do the trick
	// We need a bit more time for the real wrapper sizes to set in
	setTimeout(() => {
		sizes = {
			height: (props.wrapperRef?.clientHeight || 250),
			width: (props.wrapperRef?.clientWidth || 500),
		};

		editor = monaco.editor.create(monacoEditorWrapperRef.value!, {
			value: code,
			language: 'json',
			theme: 'vs-dark',
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
				alwaysConsumeMouseWheel: false
			},
			folding: false,
			dimension: sizes,
			scrollBeyondLastLine: false,
		});

		// Debounce system
		let debounce: any;
		editor.onDidChangeModelContent(() => {
			clearTimeout(debounce);
			debounce = setTimeout(async () => {
				const stringifiedCode = editor?.getValue();
				await emit('codeChange', tryJsonParse(stringifiedCode));
			}, 300);
		});
	}, 10);
};

onBeforeUnmount(() => {
	editor?.dispose();
});

onMounted(() => {
	setMonacoEditorSizes();
});

window.addEventListener('resize', setMonacoEditorSizes);
onBeforeUnmount(() => {
	window.removeEventListener('resize', setMonacoEditorSizes);
});

const monacoEditorWrapperRef = ref<InstanceType<typeof HTMLDivElement> | null>(null); // Template ref
</script>

<template>
	<div v-bind.sync="$attrs" ref="monacoEditorWrapperRef"></div>
</template>