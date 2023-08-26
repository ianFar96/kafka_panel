<script setup lang="ts">
import { AutosendOptions, AutosendTime } from '../types/autosend';
import Select from './Select.vue';

defineProps<{
  configuration: AutosendOptions
}>();

const timeUnits: Record<AutosendTime['time_unit'], AutosendTime['time_unit']> = {
	Hours: 'Hours',
	Minutes: 'Minutes',
	Seconds: 'Seconds',
	Milliseconds: 'Milliseconds',
};
</script>

<template>
  <div class="flex justify-center w-full py-8">
    <!-- TODO: componentize the input -->
    <!-- TODO: add option of number of messages and batch message qty -->
    <div class="mr-10 flex">
      <span class="border-gray-400 border-b py-1 px-3 font-bold">Duration</span>
      <input type="number"
        class="block bg-transparent outline-none border-b border-gray-400 py-1 px-3 w-24 text-center" 
        v-model="configuration.duration.value">
      <Select :select="value => configuration.duration.time_unit = value as AutosendTime['time_unit']" 
        :options="timeUnits"
        :selected-value="configuration.duration.time_unit" />
    </div>
    <div class="flex">
      <span class="border-gray-400 border-b py-1 px-3 font-bold">Interval</span>
      <input type="number"
        class="block bg-transparent outline-none border-b border-gray-400 py-1 px-3 w-24 text-center"
        v-model="configuration.interval.value">
      <Select :select="value => configuration.interval.time_unit = value as AutosendTime['time_unit']" 
        :options="timeUnits"
        :selected-value="configuration.interval.time_unit" />
    </div>
  </div>
</template>

<style>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>