
<script setup lang="ts">
import { ref } from 'vue';
import { MessageContent } from '../types/message';
import CodeEditor from './CodeEditor.vue';

const props = defineProps<{
	message?: Omit<MessageContent, 'headers'>,
}>();

// eslint-disable-next-line vue/no-setup-props-destructure
const message: Partial<Omit<MessageContent, 'headers'>> = props.message ?? {};

const emit = defineEmits<{
	(event: 'change', message: Partial<Omit<MessageContent, 'headers'>>): void | Promise<void>
}>();

let keyDebounce: any;
const onKeyChange = (key: unknown) => {
	clearTimeout(keyDebounce);
	keyDebounce = setTimeout(() => {
		message.key = key;
		emit('change', message);
	}, 300);
};

let valueDebounce: any;
const onValueChange = (value: unknown) => {
	clearTimeout(valueDebounce);
	valueDebounce = setTimeout(() => {
		message.value = value;
		emit('change', message);
	}, 300);
};

// We only need one of the slots since they are the same
const keySlotRef = ref<HTMLElement | null>(null);
</script>

<template>
	<div class="flex h-full">
		<div class="flex flex-col w-full">
			<label class="mb-4">Key</label>
			<div class="h-full rounded-xl overflow-hidden" ref="keySlotRef">
				<CodeEditor v-if="keySlotRef" :wrapper-ref="keySlotRef"
					:code="props.message?.key" @code-change="onKeyChange">
				</CodeEditor>
			</div>
		</div>
		<div class="h-full bg-white w-px mx-4 shrink-0"></div>
		<div class="flex flex-col w-full">
			<label class="mb-4">Value</label>
			<div class="h-full rounded-xl overflow-hidden">
				<CodeEditor v-if="keySlotRef" :wrapper-ref="keySlotRef"
					:code="props.message?.value" @code-change="onValueChange">
				</CodeEditor>
			</div>
		</div>
	</div>
</template>