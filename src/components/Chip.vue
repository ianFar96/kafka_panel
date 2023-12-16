
<script setup lang="ts">
import { computed } from 'vue';
import { chipColors, disabledColor } from '../services/chipColors';

export type Tag = {
	name: string,
	color: keyof typeof chipColors
}

const props = defineProps<{
  chipColor: keyof typeof chipColors,
  disabled?: boolean
}>();

const color = computed(() => props.disabled ? disabledColor : chipColors[props.chipColor]);
</script>

<template>
  <button v-bind="$attrs"
   :class="`rounded border ${color} py-1 px-2 w-fit text-sm block whitespace-nowrap`">
    <slot></slot>
  </button>
</template>