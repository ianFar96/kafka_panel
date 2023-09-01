<script lang="ts" setup>
import { computed } from 'vue';
import { chipColors } from '../services/chipColors';

const props = defineProps<{
  color: keyof typeof chipColors
}>();

const hoverClasses = computed(() => {
	switch (props.color) {
	case 'green':
		return /*tw*/ 'hover:border-green-400 hover:text-green-400';
	case 'yellow':
		return /*tw*/ 'hover:border-yellow-400 hover:text-yellow-400';
	case 'indigo':
		return /*tw*/ 'hover:border-indigo-400 hover:text-indigo-400';
	case 'orange':
		return /*tw*/ 'hover:border-orange-400 hover:text-orange-400';
	case 'teal':
		return /*tw*/ 'hover:border-teal-400 hover:text-teal-400';
	case 'red':
		return /*tw*/ 'hover:border-red-400 hover:text-red-400';
	case 'purple':
		return /*tw*/ 'hover:border-purple-400 hover:text-purple-400';
	case 'amber':
		return /*tw*/ 'hover:border-amber-400 hover:text-amber-400';
	case 'sky':
		return /*tw*/ 'hover:border-sky-400 hover:text-sky-400';
	case 'pink':
		return /*tw*/ 'hover:border-pink-400 hover:text-pink-400';
	case 'emerald':
		return /*tw*/ 'hover:border-emerald-400 hover:text-emerald-400';
	case 'fuchsia':
		return /*tw*/ 'hover:border-fuchsia-400 hover:text-fuchsia-400';
	case 'lime':
		return /*tw*/ 'hover:border-lime-400 hover:text-lime-400';
	case 'blue':
		return /*tw*/ 'hover:border-blue-400 hover:text-blue-400';
	case 'violet':
		return /*tw*/ 'hover:border-violet-400 hover:text-violet-400';
	case 'cyan':
		return /*tw*/ 'hover:border-cyan-400 hover:text-cyan-400';
	case 'rose':
		return /*tw*/ 'hover:border-rose-400 hover:text-rose-400';
	default:
		throw new Error('Unsupported color');
	}
});
</script>

<template>
  <button v-bind="$attrs"
    :class="`border border-white rounded py-1 px-4 transition-colors ${hoverClasses}`">
    <slot></slot>
  </button>
</template>