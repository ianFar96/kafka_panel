
<script setup lang="ts">
import { Connection } from '../types/connection';

const props = defineProps<{
  connections: Connection[]
  setConnection: (connection: Connection) => Promise<void>
}>();

const onChange = (connection: Connection) => {
	props.setConnection(connection);
};

</script>

<template>
  <ul class="-mt-4">
    <li :class="{'border-b': key !== connections.length - 1}" :key="key" class="border-white py-4 cursor-pointer"
      v-for="connection, key of props.connections" @click="onChange(connection)">
      {{ connection.name }}
    </li>
  </ul>
</template>