<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from './Button.vue';
import Dialog from './Dialog.vue';
import { chipColors } from '../services/chipColors';

type ShowOptions = {
  type: 'error' | 'warn' | 'info'
	title: string
  description: string
}

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

const currentOptions = ref<ShowOptions>();

defineExpose({
	show: (options: ShowOptions) => {
		currentOptions.value = options;
		dialog.value?.open();
	},
});

const color = computed((): keyof typeof chipColors => {
	switch (currentOptions.value?.type) {
	case 'error':
		return 'red';
	case 'info':
		return 'blue';
	case 'warn':
	default:
		return 'orange';
	}
});
</script>

<template>
  <Dialog ref="dialog" size="s" :title="currentOptions?.title" underlay-class="z-20">
    <p class="mb-8" v-html="currentOptions?.description.replace(/\n/g, '<br />')"></p>
    <div class="flex justify-end">
      <Button @click="dialog?.close()" :color="color">Ok</Button>
    </div>
  </Dialog>
</template>