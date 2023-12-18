<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

type Props = {
  title?: string
  onClose?: () => void
  modalClass?: string
  underlayClass?: string
  size?: 's' | 'fullpage',
  closable?: boolean
}
const props = withDefaults(defineProps<Props>(), { modalClass: '', underlayClass: '', closable: true });

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
		return /*tw*/'max-h-[600px] w-[400px]';
	case 'fullpage':
		return /*tw*/'h-full w-full ';
	default:
		return '';
	}
});

const refreshEvent = (event: KeyboardEvent) => {
	if (event.key === 'Escape' && props.closable) {
		close();
	}
};
window.addEventListener('keydown', refreshEvent);
onBeforeUnmount(() => {
	window.removeEventListener('keydown', refreshEvent);
});

const clickOutside = () => {
	if (props.closable) {
		close();
	}
};
</script>
<template>
  <Teleport to="#app">
    <div v-if="visible" @click.self="clickOutside"
      :class="`z-10 absolute top-10 left-0 h-[calc(100%-theme(spacing.10))] w-full bg-black bg-opacity-60 ${props.underlayClass} p-10 pl-16 flex items-center justify-center`">
      <div :class="`relative rounded bg-gray-800 flex flex-col p-6 shrink-0 ${dimensionClasses} ${props.modalClass}`">
        <button @click="close()" alt="close" v-if="props.closable"
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