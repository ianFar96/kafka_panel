<script setup lang="ts">
import { nextTick, ref } from 'vue';
import Button from './Button.vue';
import Dialog from './Dialog.vue';

type AskOptions = {
  title: string
  description: string
}

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const currentOptions = ref<AskOptions>();
let resolveAsk: ((value: boolean | PromiseLike<boolean>) => void) | undefined;

defineExpose({
	ask: (options: AskOptions) => {
		resolveAsk = undefined;
		currentOptions.value = options;
		dialog.value?.open();

		return new Promise<boolean>(resolve => {
			resolveAsk = resolve;
		});
	},
});

const decide = (decision: boolean) => {
	resolveAsk?.(decision);
	dialog.value?.close();
};
</script>

<template>
  <Dialog ref="dialog" :title="currentOptions?.title" @close="resolveAsk?.(false)" underlay-class="z-20">
    <p class="mb-8" v-html="currentOptions?.description.replace(/\n/g, '<br />')"></p>
    <div class="flex justify-between">
      <Button @click="decide(false)" color="red">Cancel</Button>
      <Button @click="decide(true)" color="green">Accept</Button>
    </div>
  </Dialog>
</template>