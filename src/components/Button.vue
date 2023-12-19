<script lang="ts" setup>
import { computed } from 'vue';
import { chipColors } from '../services/chipColors';

const props = defineProps<{
  color: keyof typeof chipColors
}>();

const hoverClasses = computed(() => {
	switch (props.color) {
	case 'green':
		return /*tw*/ 'enabled:hover:border-green-400 enabled:hover:text-green-400 enabled:focus:border-green-400 enabled:focus:text-green-400';
	case 'yellow':
		return /*tw*/ 'enabled:hover:border-yellow-400 enabled:hover:text-yellow-400 enabled:focus:border-yellow-400 enabled:focus:text-yellow-400';
	case 'indigo':
		return /*tw*/ 'enabled:hover:border-indigo-400 enabled:hover:text-indigo-400 enabled:focus:border-indigo-400 enabled:focus:text-indigo-400';
	case 'orange':
		return /*tw*/ 'enabled:hover:border-orange-400 enabled:hover:text-orange-400 enabled:focus:border-orange-400 enabled:focus:text-orange-400';
	case 'teal':
		return /*tw*/ 'enabled:hover:border-teal-400 enabled:hover:text-teal-400 enabled:focus:border-teal-400 enabled:focus:text-teal-400';
	case 'red':
		return /*tw*/ 'enabled:hover:border-red-400 enabled:hover:text-red-400 enabled:focus:border-red-400 enabled:focus:text-red-400';
	case 'purple':
		return /*tw*/ 'enabled:hover:border-purple-400 enabled:hover:text-purple-400 enabled:focus:border-purple-400 enabled:focus:text-purple-400';
	case 'amber':
		return /*tw*/ 'enabled:hover:border-amber-400 enabled:hover:text-amber-400 enabled:focus:border-amber-400 enabled:focus:text-amber-400';
	case 'sky':
		return /*tw*/ 'enabled:hover:border-sky-400 enabled:hover:text-sky-400 enabled:focus:border-sky-400 enabled:focus:text-sky-400';
	case 'pink':
		return /*tw*/ 'enabled:hover:border-pink-400 enabled:hover:text-pink-400 enabled:focus:border-pink-400 enabled:focus:text-pink-400';
	case 'emerald':
		return /*tw*/ 'enabled:hover:border-emerald-400 enabled:hover:text-emerald-400 enabled:focus:border-emerald-400 enabled:focus:text-emerald-400';
	case 'fuchsia':
		return /*tw*/ 'enabled:hover:border-fuchsia-400 enabled:hover:text-fuchsia-400 enabled:focus:border-fuchsia-400 enabled:focus:text-fuchsia-400';
	case 'lime':
		return /*tw*/ 'enabled:hover:border-lime-400 enabled:hover:text-lime-400 enabled:focus:border-lime-400 enabled:focus:text-lime-400';
	case 'blue':
		return /*tw*/ 'enabled:hover:border-blue-400 enabled:hover:text-blue-400 enabled:focus:border-blue-400 enabled:focus:text-blue-400';
	case 'violet':
		return /*tw*/ 'enabled:hover:border-violet-400 enabled:hover:text-violet-400 enabled:focus:border-violet-400 enabled:focus:text-violet-400';
	case 'cyan':
		return /*tw*/ 'enabled:hover:border-cyan-400 enabled:hover:text-cyan-400 enabled:focus:border-cyan-400 enabled:focus:text-cyan-400';
	case 'rose':
		return /*tw*/ 'enabled:hover:border-rose-400 enabled:hover:text-rose-400 enabled:focus:border-rose-400 enabled:focus:text-rose-400';
	default:
		throw new Error('Unsupported color');
	}
});
</script>

<template>
  <button v-bind="$attrs"
    :class="`outline-none whitespace-nowrap flex items-center border border-white rounded py-1 px-4 transition-colors ${hoverClasses} disabled:opacity-50`">
    <slot></slot>
  </button>
</template>