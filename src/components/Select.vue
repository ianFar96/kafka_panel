<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

defineProps<{
  options: {[value: string]: string}
  selectedValue: string
  select: (value: string) => void
}>();

const isOptionsShown = ref(false);

const trigger = ref<HTMLElement>();

const toggleOptions = (event: MouseEvent) => {
	if (event.target === trigger.value) {
		isOptionsShown.value = !isOptionsShown.value;
		return;
	}

	isOptionsShown.value = false;
};
window.addEventListener('click', toggleOptions);
onUnmounted(() => {
	window.removeEventListener('click', toggleOptions);
});
</script>

<template>
  <div class="relative">
    <label ref="trigger" class="block bg-transparent outline-none border-b border-gray-400 py-1 px-3 min-w-24 cursor-pointer">
      {{ options[selectedValue] }}
    </label>
    <ul v-if="isOptionsShown" class="absolute top-full mt-2 left-0 px-3 py-2 rounded-md bg-gray-900">
      <li class="mb-2 cursor-pointer hover:text-orange-400 transition-colors" 
        v-for="[value, label] in Object.entries(options)" :key="value" @click="select(value)">
        {{ label }}
      </li>
    </ul>
  </div>
</template>