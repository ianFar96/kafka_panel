
<script setup lang="ts">
import { Connection } from '../types/connection';

const props = defineProps<{
  connections: Connection[]
  selectedConnection?: string,
}>();

const emit = defineEmits<{
  (event: 'submit', connection: Connection): Promise<void> | void
}>();

const onChange = async (connection: Connection) => {
	await emit('submit', connection);
};

</script>

<template>
  <ul class="h-full flex flex-col overflow-auto">
    <li :class="{'border-b': key !== connections.length - 1, 'bg-gray-700': selectedConnection === connection.name}" :key="key" 
      class="border-white cursor-pointer hover:bg-gray-700 p-3 flex justify-between items-center"
      v-for="connection, key of props.connections" @click="onChange(connection)">
      {{ connection.name }}
      <i v-if="selectedConnection === connection.name" class="bi-check-lg text-xl text-green-600"></i>
    </li>
  </ul>
</template>