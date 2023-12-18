
<script setup lang="ts">
import { ref } from 'vue';
import Button from './Button.vue';

const name = ref<string>();
const partitions = ref<number>();
const replicationFactor = ref<number>();

const props = defineProps<{
  createTopic: (name: string, partitions?: number, replicationFactor?: number) => Promise<void>
}>();

const handleSubmit = async (event: Event) => {
	event.preventDefault();

	if (
		!name.value ||
    typeof name.value !== 'string' ||
    (partitions.value !== undefined && isNaN(partitions.value as any)) ||
    (replicationFactor.value !== undefined && isNaN(replicationFactor.value as any))
	) return;

	await props.createTopic(name.value, partitions.value, replicationFactor.value);

	// Reset form
	name.value = undefined;
	partitions.value = undefined;
	replicationFactor.value = undefined;
};
</script>

<template>
  <form @submit="handleSubmit">
    <input v-model="name" type="text"
      class="block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
      name="name" placeholder="Name*">
    <input v-model="partitions" type="number"
      class="appearance-none block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
      name="partitions" placeholder="Partitions">
    <input v-model="replicationFactor" type="number"
      class="appearance-none block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
      name="replicationFactor" placeholder="Replications factor">
    <div class="mt-8 flex justify-end">
      <Button type="submit" :color="'green'">
        Create
      </Button>
    </div>
  </form>
</template>