<script lang="ts" setup>

export type Step = {
  name: string
  label: string
}

const props = defineProps<{
  steps: Step[],
  activeStep: Step,
  onStepClick: (step: Step) => void
}>();

const isActive = (step?: Step) => {
	if (!step) return false;
	const stepIndex = props.steps.findIndex(tmpStep => tmpStep.name === step.name);
	const activeStepIndex = props.steps.findIndex(tmpStep => tmpStep.name === props.activeStep.name);
	return stepIndex <= activeStepIndex;
};
</script>

<template>
  <ul v-bind.sync="$attrs" class="flex w-full justify-center">
    <template v-for="step, index in props.steps" :key="step.name">
      <li class="flex">
        <button @click="onStepClick(step)" class="whitespace-nowrap flex items-center text-gray-400" :class="{'text-white': isActive(step)}">
          <div class="relative rounded-full border p-4 block mr-2" :class="isActive(step) ? 'border-white' : 'border-gray-400'">
            <span class="text-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{{ index + 1 }}</span>
          </div>
          <span>{{ step.label }}</span>
        </button>
      </li>
      <li v-if="index < (props.steps.length - 1)" class="mx-4 w-[250px] flex items-center">
        <div class="w-full h-px" :class="isActive(props.steps[index + 1]) ? 'bg-white' : 'bg-gray-400'"></div>
      </li>
    </template>
  </ul>

  <template v-for="slotName in Object.keys($slots)" :key="slotName">
    <slot v-if="slotName === activeStep.name" :name="slotName"></slot>
  </template>
</template>