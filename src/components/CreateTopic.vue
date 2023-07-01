
<script setup lang="ts">
import { ref } from 'vue';

const name = ref<string>();
const partitions = ref<number>();
const replicationFactor = ref<number>();

const props = defineProps<{
  createTopic: (name: string, partitions?: number, replicationFactor?: number) => Promise<void>
}>();

const handleSubmit = async () => {
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
  <form @submit="handleSubmit()">
    <input v-model="name" type="text"
      class="block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full" placeholder="Name*">
    <input v-model="partitions" type="number"
      class="appearance-none block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
      placeholder="Partitions">
    <input v-model="replicationFactor" type="number"
      class="appearance-none block mb-6 bg-transparent outline-none border-b border-gray-400 py-1 w-full"
      placeholder="Replications factor">
    <div class="mt-8 flex justify-end">
      <button type="submit" 
        class="border border-white rounded py-1 px-4 hover:border-green-500 transition-colors hover:text-green-500">
        Create
      </button>
    </div>
  </form>
</template>