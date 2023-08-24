
<script setup lang="ts">
import MonacoEditor from 'monaco-editor-vue3';
import { ref } from 'vue';
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
const headersToEdit = sendMessage?.headers ? Object.entries(sendMessage?.headers).map(([key, value]) => ({key, value})) : null;
const headers = ref(headersToEdit);

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

const addHeader = () => {
	if (headers.value) {
		headers.value.push({
			key: '',
			value: ''
		});
	} else {
		headers.value = [{
			key: '',
			value: ''
		}];
	}
};

const removeHeader = (index: number) => {
	headers.value!.splice(index, 1);
	if (headers.value!.length <= 0) {
		headers.value = null;
	}
};

const handleSubmit = async () => {
	const headersToSubmit = headers.value ? headers.value.reduce((acc, header) => ({
		...acc,
		[header.key]: header.value
	}), {}) : null;

	await props.submit(headersToSubmit);

	// Reset form
	headers.value = [];
};
</script>

<template>
	<form @submit="handleSubmit()">
		<div class="" v-if="headers">
			<div ref="headerItemRef" class="mb-4" v-for="header, index in headers" :key="header.key">
				<div class="flex items-end mb-2">
					<input type="text" v-model.lazy="header.key"
						class="block bg-transparent outline-none border-b border-gray-400 py-1 w-full" placeholder="Name*">
					<i class="bi-trash hover:text-red-500 transition-colors cursor-pointer text-lg border-b border-gray-400"
						@click="removeHeader(index)"></i>
				</div>

				<!-- FIXME: writing first the name of the headers breaks it's value monaco editor -->
				<div class="h-full rounded-xl overflow-hidden">
					<MonacoEditor theme="vs-dark" :options="editorOptions" language="json"
						:width="750" :height="250" v-model:value="header.value">
					</MonacoEditor>
				</div>
			</div>
		</div>
		<button class="border border-white rounded py-1 px-4 hover:border-orange-400 transition-colors hover:text-orange-400 w-full"
			type="button" @click="addHeader">
			Add Header
		</button>
		<div class="mt-8 flex justify-end flex-none">
			<button type="submit"
				class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
				{{ submitButtonText }}
			</button>
		</div>
	</form>
</template>