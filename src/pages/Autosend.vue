<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { message } from '@tauri-apps/api/dialog';
import { computed, onUnmounted, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useAutosends } from '../composables/autosends';
import { useLoader } from '../composables/loader';
import checkSettings from '../services/checkSettings';
import db from '../services/database';
import { ActiveAutosend } from '../types/autosend';
import { Connection } from '../types/connection';
import { Setting, SettingKey } from '../types/settings';

type DisplayAutosend = ActiveAutosend & {
	valueVisible: boolean;
}

await checkSettings('autosend');

const router = useRouter();

const settingKeys: SettingKey[] = ['CONNECTIONS'];
const settings = await db.settings.bulkGet(settingKeys) as Setting[];
const settingsMap: { [key: string]: Setting } = settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting }), {});

const connections: Connection[] = JSON.parse(settingsMap['CONNECTIONS'].value);

if (connections.length <= 0) {
	await message('Please make sure you have at least one connection configured for Connections setting', { title: 'Error', type: 'error' });
	router.push('/settings');
}

const loader = useLoader();

const { autosends, startAutosend, stopAutosend } = useAutosends();

// Copy readonly autosends to update the visibility toggle
const displayAutosends = ref<DisplayAutosend[]>([]);
watchEffect(() => {
	displayAutosends.value = autosends.value.map(autosend => {
		return {
			...autosend,
			valueVisible: false
		};
	});
});

const searchQuery = ref('');

const filteredAutosends = computed(() => {
	if (!searchQuery.value) return displayAutosends.value;
	return displayAutosends.value
		.filter(autosend => {
			const query = searchQuery.value.toLowerCase();
			const includesTopic = autosend.topic.includes(query);
			return includesTopic;
		});
});

onUnmounted(async () => {
	for (const autosend of autosends.value) {
		await stopAutosend(autosend as ActiveAutosend);
	}
});

// TODO: remove this
for (const index of [1,2,3,4,5]) {
	await startAutosend({
		key: {
			patata: `hola-${index}`
		},
		value: {
			patata: `hola-${index}`
		},
		topic: `topic-autosend-${index}`,
		options: {
			duration: {
				time_unit: 'Seconds',
				value: 10
			},
			interval: {
				time_unit: 'Seconds',
				value: 1
			}
		}
	});
}

</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" title="Autosend">
				Autosend
			</h2>
		</div>

		<div class="mb-6">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search by topic">
		</div>

		<ul class="h-full overflow-auto">
			<li v-for="autosend, index in filteredAutosends" :key="index" :class="{'border-b': index !== filteredAutosends.length - 1}"
				class="border-white overflow-hidden">
				<div class="flex justify-between items-center w-full cursor-pointer py-4"
					@click="autosend.valueVisible = !autosend.valueVisible">
					<div class="flex">
						<span class="text-md mr-4 flex items-center" title="Topic">
							<i class="bi-list-ul mr-2 leading-none"></i>
							{{ autosend.topic }}
						</span>
						<span class="text-md mr-4 flex items-center" title="Duration">
							<i class="bi-alarm mr-2 leading-none"></i>
							{{ autosend.options.duration.value }}
							{{ autosend.options.duration.time_unit }}
						</span>
						<span class="text-md mr-4 flex items-center" title="Interval">
							<i class="bi-stopwatch mr-2 leading-none"></i>
							{{ autosend.options.interval.value }}
							{{ autosend.options.interval.time_unit }}
						</span>
						<span class="text-md mr-4 flex items-center" title="Remaining">
							<i class="bi-hourglass-split mr-2 leading-none"></i>
							{{ autosend.timer.remaining }}
						</span>
					</div>
					<i class="text-xl leading-none"
						:class="{'bi-chevron-up': autosend.valueVisible, 'bi-chevron-down': !autosend.valueVisible}"></i>
				</div>

				<div v-if="autosend.valueVisible" class="mb-4 relative">
					<div class="absolute top-4 right-4">
						<!-- TODO: stop autosend -->
						<!-- <button @click="defineMessageToSend(autosend)"
							title="Send again"
							class="text-xl leading-none bi-send transition-colors duration-300 cursor-pointer hover:text-green-500">
						</button> -->
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="JSON.stringify({key: autosend.key, value: autosend.value}, null, 2)" />
					</div>
				</div>
			</li>
		</ul>
		
	</div>
</template>
