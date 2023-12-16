<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window';
import { onMounted, provide, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AlertDialog from './components/AlertDialog.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import Loader from './components/Loader.vue';
import { useAutosendsStore } from './composables/autosends';

const router = useRouter();
let title = ref<string>();
router.afterEach(to => {
	title.value = to.meta.title as string;
});

const loader = ref<InstanceType<typeof Loader> | null>(null); // Template ref
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null); // Template ref
const alertDialog = ref<InstanceType<typeof AlertDialog> | null>(null); // Template ref

onMounted(() => {
	provide('confirmDialog', confirmDialog);
	provide('alertDialog', alertDialog);
	provide('loader', loader);
});

const autosendStore = useAutosendsStore();

const route = useRoute();
</script>

<template>
  <div class="h-screen overflow-hidden flex flex-col">
    <nav data-tauri-drag-region class="flex-shrink-0 flex items-center justify-between bg-gray-700">
      <div class="flex items-center">
        <button @click="router.back()" title="Go back"
          class="bi-chevron-left cursor-pointer hover:bg-gray-600 text-sm px-3.5 py-2.5">
        </button>
        <button @click="router.forward()" title="Go forward"
          class="bi-chevron-right cursor-pointer hover:bg-gray-600 text-sm px-3.5 py-2.5">
        </button>
      </div>
      <span class="text-sm absolute left-1/2 -translate-x-1/2 select-none">Kafka Panel - {{ title }}</span>
      <div class="flex items-center">
        <button @click="appWindow.minimize()" title="Minimize"
          class="bi-dash-lg cursor-pointer hover:bg-gray-600 text-xs px-4 py-3" alt="minimize">
        </button>
        <button @click="appWindow.toggleMaximize()" title="Maximize"
          class="bi-square cursor-pointer hover:bg-gray-600 text-xs px-4 py-3" alt="maximize">
        </button>
        <button @click="appWindow.close()" title="Close"
          class="bi-x-lg cursor-pointer hover:bg-gray-600 text-xs px-4 py-3" alt="close">
        </button>
      </div>
    </nav>
    <section class="flex-auto flex items-stretch max-h-[calc(100%-40px)]">
      <aside class="flex-shrink-0 bg-gray-800 flex flex-col justify-between">
        <div>
          <router-link to="/topics" title="Topics"
            class="w-16 h-16 flex justify-center items-center cursor-pointer hover:border-l border-white mt-4"
            :class="{'border-l': route.path.includes('/topics')}">
            <i class="bi-list-ul text-[32px] leading-none"></i>
          </router-link>
          <router-link to="/messages-storage" title="Messages storage"
            class="w-16 h-16 flex justify-center items-center cursor-pointer hover:border-l border-white mt-4"
            :class="{'border-l': route.path.includes('/messages-storage')}">
            <i class="bi-database text-[28px] leading-none"></i>
          </router-link>
          <router-link to="/autosend" title="Autosends"
            class="w-16 h-16 flex justify-center items-center cursor-pointer hover:border-l border-white mt-4 relative"
            :class="{'border-l': route.path.includes('/autosend')}">
            <i class="bi-repeat text-[28px] leading-none"></i>
            <i v-if="autosendStore.autosends.length > 0"
              class="absolute top-2 right-2 text-xs not-italic h-5 w-5 leading-none flex items-center justify-center bg-red-700 text-white text-center rounded-full">
              {{ autosendStore.autosends.length }}
            </i>
          </router-link>
        </div>
        <div>
          <router-link to="/settings" class="px-4 py-3 cursor-pointer hover:border-l border-white block text-center"
            title="Settings" :class="{'border-l': route.path === '/settings'}">
            <i class="bi-gear text-3xl"></i>
          </router-link>
        </div>
      </aside>
      <main id="page-content" class="w-full overflow-auto p-10 relative">
        <!-- FIXME: when removing KeepAlive component routes stop working -->
        <!-- Unhandled Promise Rejection: NotFoundError: The object can not be found here. -->
        <RouterView v-slot="{ Component }">
          <template v-if="Component">
            <KeepAlive include="Topics">
              <Suspense>
                <component :is="Component"></component>
              </Suspense>
            </KeepAlive>
          </template>
        </RouterView>
      </main>
    </section>
  </div>

  <AlertDialog ref="alertDialog" />
  <ConfirmDialog ref="confirmDialog" />
  <Loader ref="loader" />
</template>