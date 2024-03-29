<script setup lang="ts">
import { ref } from 'vue';
import { AutosendOptions, AutosendTime } from '../types/autosend';
import Select from './Select.vue';

const props = defineProps<{
  configuration: AutosendOptions
}>();

const configuration = ref(props.configuration);

const emit = defineEmits<{
  (event: 'change', configuration: AutosendOptions): Promise<void> | void
}>();

const timeUnits: Record<AutosendTime['time_unit'], AutosendTime['time_unit']> = {
	Hours: 'Hours',
	Minutes: 'Minutes',
	Seconds: 'Seconds',
	Milliseconds: 'Milliseconds',
};

const onSelectDuration = async (value: string) => {
	configuration.value.duration.time_unit = value as AutosendTime['time_unit'];
	await emit('change', configuration.value);
};

const onSelectInterval = async (value: string) => {
	configuration.value.interval.time_unit = value as AutosendTime['time_unit'];
	await emit('change', configuration.value);
};

const onChangeDuration = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	configuration.value.duration.value = parseInt(target.value);
	await emit('change', configuration.value);
};

const onChangeInterval = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	configuration.value.interval.value = parseInt(target.value);
	await emit('change', configuration.value);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-auto">
    <div class="flex justify-center w-full py-8">
      <div class="mr-10 flex">
        <span class="border-gray-400 border-b py-1 px-3 font-bold">Duration</span>
        <input type="number"
          class="block bg-transparent outline-none border-b border-gray-400 py-1 px-3 w-24 text-center" 
          :value="configuration.duration.value" @change="onChangeDuration($event)">
        <Select :select="onSelectDuration" 
          :options="timeUnits"
          :selected-value="configuration.duration.time_unit" />
      </div>
      <div class="flex">
        <span class="border-gray-400 border-b py-1 px-3 font-bold">Interval</span>
        <input type="number"
          class="block bg-transparent outline-none border-b border-gray-400 py-1 px-3 w-24 text-center"
          :value="configuration.interval.value" @change="onChangeInterval($event)">
        <Select :select="onSelectInterval" 
          :options="timeUnits"
          :selected-value="configuration.interval.time_unit" />
      </div>
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