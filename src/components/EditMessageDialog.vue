
<script setup lang="ts">
import MonacoEditor from 'monaco-editor-vue3';
import { nextTick, onBeforeUnmount, ref } from 'vue';
import Dialog from './Dialog.vue';
import { appWindow } from '@tauri-apps/api/window';
import { SendMessage } from '../types/message';

const key = ref<string>();
const value = ref<string>();

const props = defineProps<{
  submit: (key: string, value: string) => Promise<void>,
	submitButtonText: string
}>();

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

	dialog.value?.closeDialog();

	// Reset form
	key.value = undefined;
	value.value = undefined;
};

type Sizes = {
  width: number
  height: number
}
let monacoEditorSizes = ref<Sizes | undefined>();

const setMonacoEditorSizes = () => {
	monacoEditorSizes.value = undefined;

	nextTick(() => {
		monacoEditorSizes.value = {
			height: (dialog.value?.$el?.children?.[0]?.clientHeight || 250) - 200,
			width: ((dialog.value?.$el?.children?.[0]?.clientWidth || 500)  / 2) - 40,
		};
	});
};

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

defineExpose({
	openDialog: (message?: SendMessage) => {
		key.value = typeof message?.key === 'object' ? 
			JSON.stringify(message?.key || undefined, null, 2) :
			message?.key;
		value.value = typeof message?.value === 'object' ? 
			JSON.stringify(message?.value || undefined, null, 2) :
			message?.value;

		dialog.value?.openDialog();
		setMonacoEditorSizes();
	},
	closeDialog: () => dialog.value?.closeDialog(),
});

const unlisten = await appWindow.onResized(() => {
	setMonacoEditorSizes();
});

onBeforeUnmount(() => {
	unlisten();
});

</script>

<template>
  <Dialog ref="dialog" :title="'Send Message'" modal-class="max-w-[1200px] w-[calc(100%-theme(spacing.24))] h-[calc(100%-theme(spacing.24))]">
    <form @submit="handleSubmit()">
      <div class="flex">
        <template v-if="monacoEditorSizes">
          <div class="border-r border-white mr-4 pr-4">
            <label>Key</label>
            <MonacoEditor theme="vs-dark" :options="editorOptions" language="json"
              :width="monacoEditorSizes.width" :height="monacoEditorSizes.height" v-model:value="key">
            </MonacoEditor>
          </div>
          <div>
            <label>Value</label>
            <MonacoEditor theme="vs-dark" :options="editorOptions" language="json"
              :width="monacoEditorSizes.width" :height="monacoEditorSizes.height" v-model:value="value">
            </MonacoEditor>
          </div>
        </template>
      </div>
      <div class="mt-8 flex justify-end">
        <button type="submit"
          class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
					{{ submitButtonText }}
				</button>
      </div>
    </form>
  </Dialog>
</template>