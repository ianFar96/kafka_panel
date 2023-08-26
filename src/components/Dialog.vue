<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

type Props = {
  title?: string
  onClose?: () => void
  modalClass?: string
  underlayClass?: string
  size?: 's' | 'fullpage'
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

const dimensionClasses = computed(() => {
	switch(props.size) {
	case 's':
		return /*tw*/'h-[350px] w-[400px]';
	case 'fullpage':
	default: 
		return /*tw*/'h-full w-full ';
	}
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
    <div v-if="visible" :class="`z-10 absolute top-0 left-0 h-full w-full bg-black bg-opacity-40 ${props.underlayClass} p-10 flex items-start justify-center`">
      <div :class="`relative rounded bg-gray-800 flex flex-col h-full p-6 shrink-0 ${dimensionClasses} ${props.modalClass}`">
        <button @click="close()" alt="close"
          class="absolute top-0 right-0 bi-x-lg cursor-pointer hover:text-gray-300 hover:bg-gray-700 text-xs px-4 py-3">
        </button>
        <h2 class="mb-6 text-xl">
          {{ title }}
        </h2>
        <div class="overflow-auto h-full flex flex-col">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>