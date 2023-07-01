<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

type Props = {
  title?: string
  onClose?: () => void
  modalClass?: string
  underlayClass?: string
}
const props = withDefaults(defineProps<Props>(), { modalClass: '', underlayClass: '' });

const open = () => visible.value = true;
const close = () => {
	visible.value = false;
	if (props.onClose) props.onClose();
};

const visible = ref(false);
defineExpose({
	open,
	close,
});

const refreshEvent = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		close();
	}
};
window.addEventListener('keydown', refreshEvent);
onBeforeUnmount(() => {
	window.removeEventListener('keydown', refreshEvent);
});
</script>
<template>
  <Teleport to="#page-content">
    <div v-if="visible" :class="`z-10 absolute top-0 left-0 h-full w-full bg-black bg-opacity-40 ${props.underlayClass} p-10 overflow-auto flex items-start justify-center`">
      <div :class="`min-w-[400px] min-h-[theme(spacing.64)] max-w-full relative rounded bg-[#1e1e1e] flex flex-col p-6 ${props.modalClass}`">
        <button @click="close()" alt="close"
          class="absolute top-0 right-0 bi-x-lg cursor-pointer hover:text-gray-300 hover:bg-[#252526] text-xs px-4 py-3">
        </button>
        <h2 class="mb-6 text-xl">
          {{ title }}
        </h2>
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>