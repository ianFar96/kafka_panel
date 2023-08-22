<script setup lang="ts">
import { ref } from 'vue';

let isShown = ref(false);

defineExpose({
	show: () => {isShown.value = true;},
	hide: () => {isShown.value = false;}
});
</script>

<template>
  <div id="loader" class="fixed top-0 left-0 h-full w-full bg-black bg-opacity-75 z-50" :class="{hidden: !isShown}">
    <img class="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-32" src="../assets/loading.gif" alt="">
  </div>
</template>