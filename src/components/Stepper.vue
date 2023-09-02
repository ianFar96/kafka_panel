<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import Button from './Button.vue';

export type Step = {
  name: string
  label: string
  isValid?: () => Promise<boolean> | boolean
  onBeforeLoad?: () => Promise<void> | void
}

const props = defineProps<{
  steps: Step[]
  submitButtonText?: string
}>();

const emit = defineEmits<{
  (event: 'submit'): void
}>();

defineExpose({
	next: async () => {
		const stepIndex = props.steps.findIndex(tmpStep => tmpStep.name === activeStep.value.name);
		await onChangeStep(props.steps[stepIndex + 1]);
	}
});

const slots = ref<HTMLElement[]>([]);
onMounted(() => {
	if (slots.value.length != props.steps.length) {
		throw new Error('Expected the same number of slots and steps');
	}
});

const activeStep = ref(props.steps[0]);

const onChangeStep = async (targetStep: Step) => {
	const stepIndex = props.steps.findIndex(tmpStep => tmpStep.name === targetStep.name);

	// All previous steps must be valid
	for (let index = 0; index < stepIndex; index++) {
		const step = props.steps[index];
		if (step.isValid && !await step.isValid()) {
			return;
		}
	}

	await targetStep.onBeforeLoad?.();
	activeStep.value = targetStep;
};

const onSubmit = async () => {
	// All steps must be valid
	for (const step of props.steps) {
		if (step.isValid && !await step.isValid()) {
			return;
		}
	}

	emit('submit');
};

const isActive = (step?: Step) => {
	if (!step) return false;
	const stepIndex = props.steps.findIndex(tmpStep => tmpStep.name === step.name);
	const activeStepIndex = props.steps.findIndex(tmpStep => tmpStep.name === activeStep.value.name);
	return stepIndex <= activeStepIndex;
};
</script>

<template>
  <ul v-bind.sync="$attrs" class="flex w-full justify-center">
    <template v-for="step, index in steps" :key="step.name">
      <li class="flex">
        <button @click="onChangeStep(step)" class="whitespace-nowrap flex items-center text-white" :class="{'text-orange-400': isActive(step)}">
          <div class="relative rounded-full border p-4 block mr-2" :class="isActive(step) ? 'border-orange-400' : 'border-white'">
            <span class="text-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{{ index + 1 }}</span>
          </div>
          <span>{{ step.label }}</span>
        </button>
      </li>
      <li v-if="index < (steps.length - 1)" class="mx-4 w-[250px] flex items-center">
        <div class="w-full h-px" :class="isActive(steps[index + 1]) ? 'bg-orange-400' : 'bg-white'"></div>
      </li>
    </template>
  </ul>

  <!-- Just to have the number of slots in the script -->
  <i class="hidden" ref="slots" v-for="slotName in Object.keys($slots)" :key="slotName"></i>

  <template v-for="slotName, index in Object.keys($slots)" :key="slotName">
    <template v-if="slotName === activeStep.name" >
      <slot :name="slotName"></slot>
      <div class="flex mt-4 justify-between">
        <Button :disabled="index <= 0" color="orange" @click="onChangeStep(steps[index - 1])">
          Back
        </Button>
        <Button v-if="Object.keys($slots).length > index + 1" color="orange" @click="onChangeStep(steps[index + 1])">
          Next
        </Button>
        <Button v-else color="green" @click="onSubmit">
          {{ submitButtonText ?? 'Save' }}
        </Button>
      </div>
    </template>
  </template>
</template>