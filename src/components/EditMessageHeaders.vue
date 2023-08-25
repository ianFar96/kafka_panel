
<script setup lang="ts">
import { ref } from 'vue';
import { ParsedHeaders } from '../types/message';
import CodeEditor from './CodeEditor.vue';

const props = defineProps<{
	submit: (headers: ParsedHeaders) => Promise<void>,
	submitButtonText: string,
	headers?: ParsedHeaders
}>();

const headersToEdit = props.headers ? Object.entries(props.headers).map(([key, value]) => ({key, value})) : null;
const headers = ref(headersToEdit);

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

const onHeaderValueChange = (code: unknown, index: number) => {
	headers.value![index].value = code;
};

const onHeaderKeyChange = (event: Event, index: number) => {
	headers.value![index].key = (event.target as HTMLInputElement).value;
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

const codeWrapperRef = ref<HTMLElement | null>(null);
</script>

<template>
	<form @submit="handleSubmit()">
		<div class="" v-if="headers">
			<div ref="headerItemRef" class="mb-4" v-for="header, index in headers" :key="header.key">
				<div class="flex items-end mb-2">
					<input type="text" :value="header.key" @change="onHeaderKeyChange($event, index)"
						class="block bg-transparent outline-none border-b border-gray-400 py-1 w-full" placeholder="Name*">
					<i class="bi-trash hover:text-red-500 transition-colors cursor-pointer text-lg border-b border-gray-400"
						@click="removeHeader(index)"></i>
				</div>

				<!-- FIXME: writing first the name of the headers breaks it's value monaco editor -->
				<div class="h-[250px] w-[500px] rounded-xl overflow-hidden" ref="codeWrapperRef">
					<CodeEditor v-if="codeWrapperRef" :wrapper-ref="codeWrapperRef" :code="header.value" @code-change="onHeaderValueChange($event, index)">
					</CodeEditor>
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