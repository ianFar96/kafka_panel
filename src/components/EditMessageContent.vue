
<script setup lang="ts">
import { ref } from 'vue';
import { MessageContent } from '../types/message';
import CodeEditor from './CodeEditor.vue';
import { isSendValid } from '../services/utils';

const props = defineProps<{
	submit: (message: Omit<MessageContent, 'headers'>) => Promise<void>,
	submitButtonText: string,
	message?: Omit<MessageContent, 'headers'>
}>();

const key = ref(props.message?.key);
const value = ref(props.message?.value);

const onKeyChange = (code: unknown) => {
	key.value = code;
};
const onValueChange = (code: unknown) => {
	value.value = code;
};
	
const handleSubmit = async () => {
	if (!isSendValid(key.value) || !isSendValid(value.value)) return;

	await props.submit({
		key: key.value,
		value: value.value
	});

	// Reset form
	key.value = '';
	value.value = '';
};

// We only need one of the slots since they are the same
const keySlotRef = ref<HTMLElement | null>(null);
</script>

<template>
	<form class="h-full flex flex-col" @submit="handleSubmit()">
		<div class="flex h-full">
			<div class="flex flex-col w-full">
				<label class="mb-4">Key</label>
				<div class="h-full rounded-xl overflow-hidden" ref="keySlotRef">
					<CodeEditor v-if="keySlotRef" :wrapper-ref="keySlotRef"
						:code="key" @code-change="onKeyChange">
					</CodeEditor>
				</div>
			</div>
			<div class="h-full bg-white w-px mx-4 shrink-0"></div>
			<div class="flex flex-col w-full">
				<label class="mb-4">Value</label>
				<div class="h-full rounded-xl overflow-hidden">
					<CodeEditor v-if="keySlotRef" :wrapper-ref="keySlotRef"
						:code="value" @code-change="onValueChange">
					</CodeEditor>
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