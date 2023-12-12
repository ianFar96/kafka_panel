
<script setup lang="ts">
import { ref } from 'vue';
import CodeEditor from './CodeEditor.vue';
import { clone } from 'ramda';
import { faker } from '@faker-js/faker';
import { MessageKeyValue } from '../types/message';

const props = defineProps<{
	message: MessageKeyValue
}>();

const message: MessageKeyValue = clone(props.message);

const emit = defineEmits<{
	(event: 'change', message: MessageKeyValue): void | Promise<void>
}>();

// eslint-disable-next-line no-undef
let keyDebounce: NodeJS.Timer;
const onKeyChange = (key: string) => {
	clearTimeout(keyDebounce);
	keyDebounce = setTimeout(async () => {
		message.key = key;
		await emit('change', message);
	}, 300);
};

// eslint-disable-next-line no-undef
let valueDebounce: NodeJS.Timer;
const onValueChange = (value: string) => {
	clearTimeout(valueDebounce);
	valueDebounce = setTimeout(async () => {
		message.value = value !== '' ? value : null;
		await emit('change', message);
	}, 300);
};

// We only need one of the slots since they are the same
const codeEditorSlotRef = ref<HTMLElement | null>(null);
</script>

<template>
	<div class="flex h-full">
		<div class="flex flex-col w-full">
			<label class="mb-4">Key</label>
			<div class="h-full rounded-xl overflow-hidden" ref="codeEditorSlotRef">
				<CodeEditor v-if="codeEditorSlotRef" :wrapper-ref="codeEditorSlotRef"
					:suggestions="{faker}" :code="props.message.key" @code-change="onKeyChange">
				</CodeEditor>
			</div>
		</div>
		<div class="h-full bg-white w-px mx-4 shrink-0"></div>
		<div class="flex flex-col w-full">
			<label class="mb-4">Value</label>
			<div class="h-full rounded-xl overflow-hidden">
				<CodeEditor v-if="codeEditorSlotRef" :wrapper-ref="codeEditorSlotRef"
					:suggestions="{faker, key: message.key}" :code="props.message.value" @code-change="onValueChange">
				</CodeEditor>
			</div>
		</div>
	</div>
</template>