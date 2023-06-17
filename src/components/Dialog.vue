<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

type Props = {
  title?: string
  onClose?: () => void
  modalClass?: string
  underlayClass?: string
}
const props = withDefaults(defineProps<Props>(), { modalClass: '', underlayClass: '' });

const openDialog = () => visible.value = true;
const closeDialog = () => {
	visible.value = false;
	if (props.onClose) props.onClose();
};

const modalRef = ref<HTMLElement | null>(null); // Template ref

const visible = ref(false);
defineExpose({
	openDialog,
	closeDialog,
	getModalElement: () => modalRef.value
});

const refreshEvent = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		closeDialog();
	}
};
window.addEventListener('keydown', refreshEvent);
onBeforeUnmount(() => {
	window.removeEventListener('keydown', refreshEvent);
});
</script>
<template>
  <Teleport to="#page-content">
    <div v-if="visible" :class="`z-10 absolute top-0 left-0 h-full w-full bg-black bg-opacity-40 ${props.underlayClass}`">
      <div ref="modalRef" :class="`min-w-[400px] min-h-[theme(spacing.64)] max-w-[calc(100%-theme(spacing.24))] max-h-[calc(100%-theme(spacing.24))] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-[#2c2c2c] p-6 ${props.modalClass}`">
        <button @click="closeDialog()" alt="close"
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