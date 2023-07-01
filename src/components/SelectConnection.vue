
<script setup lang="ts">
import { Connection } from '../types/connection';

const props = defineProps<{
  connections: Connection[]
  submit: (connection: Connection) => Promise<void>
}>();

const onChange = (connection: Connection) => {
	props.submit(connection);
};

</script>

<template>
  <ul>
    <li :class="{'border-b': key !== connections.length - 1}" :key="key" 
      class="border-white cursor-pointer hover:bg-[#252526] p-3"
      v-for="connection, key of props.connections" @click="onChange(connection)">
      {{ connection.name }}
    </li>
  </ul>
</template>