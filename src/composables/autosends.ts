import { Duration } from 'luxon';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import { Timer } from '../services/Timer';
import { ActiveAutosend, Autosend, AutosendTime } from '../types/autosend';
import autosendsService from '../services/autosends';
import { message } from '@tauri-apps/api/dialog';

export function castAutosendTimeToDuration(time: AutosendTime) {
	let duration: Duration;
	switch (time.time_unit) {
	case 'Hours':
		duration = Duration.fromObject({hours: time.value});
		break;
	case 'Minutes':
		duration = Duration.fromObject({minutes: time.value});
		break;
	case 'Seconds':
		duration = Duration.fromObject({seconds: time.value});
		break;
	case 'Milliseconds':
		duration = Duration.fromObject({milliseconds: time.value});
		break;
	}

	return duration;
}

export const useAutosendsStore = defineStore('autosends', () => {
	const autosends = ref<ActiveAutosend[]>([]);

	async function startAutosend(autosend: Autosend) {
		const id = uuidv4();
		
		const duration = castAutosendTimeToDuration(autosend.options.duration);
		const timer = new Timer(duration);
		timer.onFinish(async () => {
			await stopAutosend(activeAutosend);
		});

		const activeAutosend: ActiveAutosend = {
			...autosend,
			timer,
			id,
		};

		// Start seding messages
		autosendsService.startAutosend(activeAutosend).subscribe({
			error: async error => {
				await message(error as string, { title: 'Error', type: 'error' });
				await stopAutosend(activeAutosend);
			}
		});

		timer.start();
		autosends.value.push(activeAutosend);
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		// Stop sending messages
		await autosend.timer.stop();
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
