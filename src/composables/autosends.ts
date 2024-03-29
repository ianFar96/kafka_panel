import { defineStore } from 'pinia';
import { map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import { AutosendsService } from '../services/autosends';
import logger from '../services/logger';
import { ActiveAutosend, Autosend } from '../types/autosend';
import { useAlertDialog } from './alertDialog';

export const useAutosendsStore = defineStore('autosends', () => {
	const autosends = ref<ActiveAutosend[]>([]);
	const autosendsService = new AutosendsService();

	const alert = useAlertDialog();

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
				logger.error(error, {autosendsService});
				alert?.value?.show({
					title: 'Error',
					type: 'error',
					description: error
				});
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
