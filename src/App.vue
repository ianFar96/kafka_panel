<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window';
import { provide, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Loader from './components/Loader.vue';

const router = useRouter();
let title = ref<string>();
router.afterEach(to => {
	title.value = to.meta.title as string;
});

const loader = ref<InstanceType<typeof Loader> | null>(null); // Template ref
provide('loader', loader);

const route = useRoute();
</script>

<template>
  <div class="h-screen overflow-hidden flex flex-col">
    <nav data-tauri-drag-region class="flex-shrink-0 flex items-center justify-between bg-orange-900">
      <div class="flex items-center">
        <button @click="router.back()"
          class="bi-chevron-left cursor-pointer hover:bg-orange-800 text-sm px-3.5 py-2.5">
        </button>
        <button @click="router.forward()"
          class="bi-chevron-right cursor-pointer hover:bg-orange-800 text-sm px-3.5 py-2.5">
        </button>
      </div>
      <span class="text-sm absolute left-1/2 -translate-x-1/2">Kafka Panel - {{ title }}</span>
      <div class="flex items-center">
        <button @click="appWindow.minimize()"
          class="bi-dash-lg cursor-pointer hover:bg-orange-800 text-xs px-4 py-3" alt="minimize">
        </button>
        <button @click="appWindow.toggleMaximize()"
          class="bi-square cursor-pointer hover:bg-orange-800 text-xs px-4 py-3" alt="maximize">
        </button>
        <button @click="appWindow.close()"
          class="bi-x-lg cursor-pointer hover:bg-orange-800 text-xs px-4 py-3" alt="close">
        </button>
      </div>
    </nav>
    <section class="flex-auto flex items-stretch max-h-[calc(100%-40px)]">
      <aside class="flex-shrink-0 bg-[#252526] flex flex-col justify-between">
        <div>
          <router-link to="/topics"
            class="w-16 h-16 flex justify-center items-center cursor-pointer hover:border-l border-white mt-4"
            :class="{'border-l': route.path.includes('/topics')}">
            <i class="bi-list-ul text-[32px] leading-none"></i>
          </router-link>
          <router-link to="/messages-storage"
            class="w-16 h-16 flex justify-center items-center cursor-pointer hover:border-l border-white mt-4"
            :class="{'border-l': route.path.includes('/messages-storage')}">
            <i class="bi-database text-[28px] leading-none"></i>
          </router-link>
        </div>
        <div>
          <router-link to="/settings" class="px-4 py-3 cursor-pointer hover:border-l border-white block text-center"
            :class="{'border-l': route.path === '/settings'}">
            <i class="bi-gear text-3xl"></i>
          </router-link>
        </div>
      </aside>
      <main id="page-content" class="w-full overflow-auto p-10 relative">
        <Loader ref="loader" />
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
</template>