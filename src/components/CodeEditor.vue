<!-- eslint-disable no-empty -->
<script lang="ts" setup>
import * as monaco from 'monaco-editor';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getMonacoEditorCompletionItems } from '../services/utils';

const props = defineProps<{
	code?: unknown,

	// Used to calculate the height and width to fit the wrapper's dimensions
	wrapperRef: HTMLElement,
	suggestions?: Record<string, unknown>
}>();

const emit = defineEmits<{
  (e: 'codeChange', code: string): Promise<void> | void
}>();

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

let editorCode = '';
switch (typeof props.code) {
case 'undefined':
	editorCode = '';
	break;
case 'object':
	if (props.code === null) {
		editorCode = '';
	} else {
		editorCode = JSON.stringify(props.code, null ,2);
	}
	break;
case 'string':
	try {
		// Format the code
		const parsedCode = JSON.parse(props.code);
		editorCode = JSON.stringify(parsedCode, null, 2);
	} catch (error) {
		editorCode = props.code;
	}
	break;
default:
	editorCode = props.code!.toString();
	break;
}
let sizes: monaco.editor.IDimension;
const initMonacoEditor = () => {
	if (editor) {
		editorCode = editor.getValue();
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
			value: editorCode,
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let debounce: any;
		editor.onDidChangeModelContent(() => {
			clearTimeout(debounce);
			debounce = setTimeout(async () => {
				const stringifiedCode = editor?.getValue();
				if(stringifiedCode !== undefined) {
					await emit('codeChange', stringifiedCode);
				}
			}, 300);
		});
	}, 10);
};

onBeforeUnmount(() => {
	editor?.dispose();
});

onMounted(() => {
	initMonacoEditor();
});

window.addEventListener('resize', initMonacoEditor);
onBeforeUnmount(() => {
	window.removeEventListener('resize', initMonacoEditor);
});

if (Object.keys(props.suggestions ?? {}).length > 0) {
	const disposable = monaco.languages.registerCompletionItemProvider('json', {
		provideCompletionItems: function (model, position) {
			if (model.id !== editor?.getModel()?.id) {
				return;
			}

			const lineTextUntilPosition = model.getValueInRange({
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: 1,
				endColumn: position.column
			});
			const numberOfOpenBrackets = lineTextUntilPosition.match(/{{/gm)?.length ?? 0;
			const numberOfClosedBrackets = lineTextUntilPosition.match(/}}/gm)?.length ?? 0;
			if (numberOfOpenBrackets <= numberOfClosedBrackets) {
				return { suggestions: [] };
			}

			const word = model.getWordUntilPosition(position);
			const range: monaco.IRange = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn
			};

			return {
				suggestions: getMonacoEditorCompletionItems(props.suggestions ?? {}, range)
			};
		},
	});

	// TS bug in type definiton
	(editor as unknown as monaco.editor.IStandaloneCodeEditor)?.onDidDispose(() => {
		disposable.dispose();
	});
}

const monacoEditorWrapperRef = ref<InstanceType<typeof HTMLDivElement> | null>(null); // Template ref
</script>

<template>
	<div v-bind.sync="$attrs" ref="monacoEditorWrapperRef"></div>
</template>