
<script setup lang="ts">
import { ref } from 'vue';
import { Headers, Key, Value } from '../types/message';
import CodeEditor from './CodeEditor.vue';
import Button from './Button.vue';
import { faker } from '@faker-js/faker';

type EditHeaders = {
	key: Key,
	value: Value
}[]

const props = defineProps<{
	headers: Headers
}>();

const emit = defineEmits<{
	(event: 'change', headers: Headers): void | Promise<void>
}>();

const headersToEditHeaders = (headers: Headers): EditHeaders => {
	return Object.entries(headers ?? {}).map(([key, value]) => ({key, value}));
};

const editHeadersToHeaders = (headers: EditHeaders): Headers => {
	return headers && headers.reduce((acc, editHeader) => ({
		...acc,
		[editHeader.key]: editHeader.value
	}), {});
};

const headersToEdit = ref(headersToEditHeaders(props.headers));

const addHeader = () => {
	if (headersToEdit.value) {
		headersToEdit.value.push({
			key: '',
			value: ''
		});
	} else {
		headersToEdit.value = [{
			key: '',
			value: ''
		}];
	}

	// No need to trigger change since the header is empty
};

const removeHeader = async (index: number) => {
	headersToEdit.value.splice(index, 1);

	const headers = editHeadersToHeaders(headersToEdit.value);
	await emit('change', headers);
};

const onHeaderKeyChange = async (event: Event, index: number) => {
	headersToEdit.value[index].key = (event.target as HTMLInputElement).value;

	const headers = editHeadersToHeaders(headersToEdit.value);
	await emit('change', headers);
};

// eslint-disable-next-line no-undef
let valueDebounce: NodeJS.Timer;
const onHeaderValueChange = (code: string, index: number) => {
	clearTimeout(valueDebounce);
	valueDebounce = setTimeout(async () => {
		headersToEdit.value[index].value = code !== '' ? code : null;

		const headers = editHeadersToHeaders(headersToEdit.value);
		await emit('change', headers);
	}, 300);
};

const codeWrapperRefs = ref<HTMLElement[] | null>([]);
</script>

<template>
	<div class="mb-4">
		<Button @click="addHeader" color="orange" class="w-full flex items-center justify-center">
			<i class="bi-card-heading mr-2"></i>
			Add Header
		</Button>
	</div>
	<div class="h-full overflow-auto">
		<template v-if="headersToEdit">
			<div ref="headerItemRef" class="mb-4" v-for="header, index in headersToEdit" :key="header.key">
				<div class="flex items-end mb-2">
					<input type="text" :value="header.key" @change="onHeaderKeyChange($event, index)"
						class="block bg-transparent outline-none border-b border-gray-400 py-1 w-full" placeholder="Name*">
					<i class="bi-trash hover:text-red-500 transition-colors cursor-pointer text-lg border-b border-gray-400"
						@click="removeHeader(index)"></i>
				</div>
				<div class="h-[250px] min-w-[500px] w-full rounded-xl overflow-hidden" ref="codeWrapperRefs">
					<CodeEditor v-if="codeWrapperRefs" :wrapper-ref="codeWrapperRefs[index]"
						:suggestions="{faker}" :code="header.value" @code-change="onHeaderValueChange($event, index)">
					</CodeEditor>
				</div>
			</div>
		</template>
	</div>
</template>