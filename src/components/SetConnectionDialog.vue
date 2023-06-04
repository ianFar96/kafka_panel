
<script setup lang="ts">
import { ref } from 'vue';
import { Connection } from '../types/connection';
import Dialog from './Dialog.vue';

const props = defineProps<{
  connections: Connection[]
  closable?: boolean
  setConnection: (connection: Connection) => Promise<void>
}>();

const onChange = (connection: Connection) => {
	props.setConnection(connection);
	dialog.value?.closeDialog();
};

const dialog = ref<InstanceType<typeof Dialog> | null>(null); // Template ref

defineExpose({
	openDialog: () => dialog.value?.openDialog(),
	closeDialog: () => dialog.value?.closeDialog(),
});

</script>

<template>
  <Dialog ref="dialog" :title="'Choose Connection'" :closable="props.closable">
    <ul class="-mt-4">
      <li :class="{'border-b': key !== connections.length - 1}" :key="key" class="border-white py-4 cursor-pointer"
        v-for="connection, key of props.connections" @click="onChange(connection)">
        {{ connection.name }}
      </li>
    </ul>
  </Dialog>
</template>