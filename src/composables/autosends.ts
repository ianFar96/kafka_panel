import { message } from '@tauri-apps/api/dialog';
import { defineStore } from 'pinia';
import { map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import autosendsService from '../services/autosends';
import { ActiveAutosend, Autosend } from '../types/autosend';

export const useAutosendsStore = defineStore('autosends', () => {
	const autosends = ref<ActiveAutosend[]>([]);

	async function startAutosend(autosend: Autosend) {
		const id = uuidv4();

		const activeAutosend: ActiveAutosend = {
			...autosend,
			id,
		};

		// Start seding messages
		const {remainingTimeObservable, messagesSentObservable, onFinish} = autosendsService.startAutosend(activeAutosend);

		activeAutosend.remainingTimeObservable = remainingTimeObservable.pipe(map(time =>  time.toFormat('hh::mm:ss')));
		activeAutosend.messagesSentObservable = messagesSentObservable;

		autosends.value.push(activeAutosend);

		messagesSentObservable.subscribe({
			error: async error => {
				await message(error as string, { title: 'Error', type: 'error' });
				await stopAutosend(activeAutosend);
			}
		});

		// On autosend finish remove it from store
		onFinish(() => {
			popAutosend(id);
		});
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		// Stop sending messages
		autosendsService.stopAutosend(autosend);

		// On autosend is stopped remove it from store
		popAutosend(autosend.id);
	}

	function popAutosend(id: string) {
		const index = autosends.value.findIndex(autosendTmp => autosendTmp.id === id);
		autosends.value.splice(index, 1);
	}

	return {
		autosends,
		startAutosend,
		stopAutosend
	};
});
