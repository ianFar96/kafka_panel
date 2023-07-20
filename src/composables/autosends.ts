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
		const {timer, messagesSent} = autosendsService.startAutosend(activeAutosend);

		activeAutosend.timer = timer.pipe(map(timer =>  timer.toFormat('hh::mm:ss')));
		activeAutosend.messagesSent = messagesSent;

		autosends.value.push(activeAutosend);

		messagesSent.subscribe({
			error: async error => {
				await message(error as string, { title: 'Error', type: 'error' });
				await stopAutosend(activeAutosend);
			}
		});
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		// Stop sending messages
		autosendsService.stopAutosend(autosend);

		const index = autosends.value.findIndex(autosendTmp => autosendTmp.id === autosend.id);
		autosends.value.splice(index, 1);
	}

	return {
		autosends,
		startAutosend,
		stopAutosend
	};
});
