<script setup lang="ts">
import { useObservable } from '@vueuse/rxjs';
import { Ref, computed, ref } from 'vue';
import EditMessageStorageStepper from '../components/EditMessageStorageStepper.vue';
import StartAutosendStepper from '../components/StartAutosendStepper.vue';
import { useAutosendsStore } from '../composables/autosends';
import checkSettings from '../services/checkSettings';
import storageService from '../services/storage';
import { autosendToStorageMessage, displayMessage } from '../services/utils';
import { ActiveAutosend, Autosend } from '../types/autosend';
import { Connection } from '../types/connection';
import { StorageMessage } from '../types/message';
import Button from '../components/Button.vue';
import logger from '../services/logger';

type DisplayAutosend = ActiveAutosend & {
	valueVisible: Ref<boolean>
	timerDisplay: Ref<string>
	messagesSentDisplay: Ref<number>
}

await checkSettings('autosend');

const connections = await storageService.settings.get('CONNECTIONS') as Connection[];

const autosendStore = useAutosendsStore();

const displayAutosends = computed(() => autosendStore.autosends.map(autosend => ({
	...autosend,
	valueVisible: ref(false),
	timerDisplay: useObservable(autosend.remainingTimeObservable!),
	messagesSentDisplay: useObservable(autosend.messagesSentObservable!),
}) as DisplayAutosend));

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

const startAutosendStepper = ref<InstanceType<typeof StartAutosendStepper> | null>(null); // Template ref
const editMessageStorageStepper = ref<InstanceType<typeof EditMessageStorageStepper> | null>(null); // Template ref

const startAutosend = async (autosend: Autosend) => {
	logger.info('Starting autosend...');
	await autosendStore.startAutosend(autosend);
};
	
const editMessageStorage = (autosend: Autosend) => {
	const storageMessage = autosendToStorageMessage(autosend, ['autosend template']);
	editMessageStorageStepper.value?.openDialog(storageMessage);
};

const saveMessageInStorage = async (message: StorageMessage) => {
	logger.info('Saving autosend message template in storage...');
	await storageService.messages.save(message);
	editMessageStorageStepper.value?.closeDialog();
};
</script>

<template>
  <div class="flex flex-col h-full relative">
		<div class="flex justify-between items-end mb-6">
			<h2 class="text-2xl mr-4 overflow-hidden text-ellipsis whitespace-nowrap" title="Autosend">
				Autosend
			</h2>
			<div class="flex">
				<Button @click="startAutosendStepper?.openDialog(connections)" color="green">
					<i class="mr-1 -ml-1 bi-play text-2xl leading-none cursor-pointer"></i>
					Start autosend
				</Button>
			</div>
		</div>

		<div class="mb-6">
			<input type="text" v-model="searchQuery"
				class="block bg-transparent outline-none border-b border-gray-400 py-1 w-[400px]" placeholder="Search by topic">
		</div>

		<ul class="h-full overflow-auto">
			<li v-for="autosend, index in filteredAutosends" :key="index" :class="{'border-b': index !== filteredAutosends.length - 1}"
				class="border-white overflow-hidden">
				<div class="flex justify-between items-center w-full cursor-pointer py-4"
					@click="autosend.valueVisible.value = !autosend.valueVisible.value">
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
							{{ autosend.timerDisplay.value || '-' }}
						</span>
						<span class="text-md mr-4 flex items-center" title="Messages sent">
							<i class="bi-send-check mr-2 leading-none"></i>
							{{ autosend.messagesSentDisplay.value || '-' }}
						</span>
					</div>
					<i class="text-xl leading-none"
						:class="{'bi-chevron-up': autosend.valueVisible.value, 'bi-chevron-down': !autosend.valueVisible.value}"></i>
				</div>

				<div v-if="autosend.valueVisible.value" class="mb-4 relative">
					<div class="absolute top-4 right-4">
						<button @click="editMessageStorage(autosend)"
							title="Save in storage"
							class="text-xl leading-none bi-database-add transition-colors duration-300 cursor-pointer mr-3">
						</button>
						<button @click="autosendStore.stopAutosend(autosend)"
							title="Stop"
							class="text-xl leading-none bi-stop-circle transition-colors duration-300 cursor-pointer hover:text-red-500">
						</button>
					</div>
					<div class="max-h-[400px] overflow-auto rounded-xl">
						<highlightjs :language="'json'" :code="displayMessage(autosend)" />
					</div>
				</div>
			</li>
		</ul>
	</div>

	<StartAutosendStepper ref="startAutosendStepper" @submit="startAutosend" />
	<EditMessageStorageStepper ref="editMessageStorageStepper" @submit="saveMessageInStorage" />
</template>
