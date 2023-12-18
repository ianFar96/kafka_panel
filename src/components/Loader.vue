<script setup lang="ts">
import { computed, ref } from 'vue';

const showRequests = ref(0);
const isShown = computed(() => showRequests.value > 0);

defineExpose({
	show: () => {showRequests.value++;},
	hide: () => {showRequests.value--;}
});
</script>

<template>
  <div id="loader" class="absolute top-10 left-0 h-[calc(100%-theme(spacing.10))] w-full bg-black bg-opacity-60 z-50" :class="{hidden: !isShown}">
    <img class="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-32" src="../assets/loading.gif" alt="">
  </div>
</template>