import { Duration } from 'luxon';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Timer } from '../services/Timer';
import { ActiveAutosend, Autosend, AutosendTime } from '../types/autosend';
import { invoke } from '@tauri-apps/api';

function createAutosendTimer(time: AutosendTime) {
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

	const timer = new Timer(duration);
	return timer;
}

export const useAutosendsStore = defineStore('autosends', () => {
	const autosends = ref<ActiveAutosend[]>([]);

	async function startAutosend(autosend: Autosend) {
		const id = await invoke<string>('start_autosend_command', autosend);

		const timer = createAutosendTimer(autosend.options.duration);
		timer.start();

		const activeAutosend: ActiveAutosend = {
			...autosend,
			timer,
			id,
		};

		activeAutosend.timer.onFinish(async () => {
			await removeAutosendFromStore(activeAutosend);
		});

		autosends.value.push(activeAutosend);
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		await autosend.timer.stop();
		await removeAutosendFromStore(autosend);
	}

	const removeAutosendFromStore = async (autosend: ActiveAutosend) => {
		await invoke('stop_autosend_command', { id: autosend.id });
		const index = autosends.value.findIndex(autosendTmp => autosendTmp.id === autosend.id);
		autosends.value.splice(index, 1);
	};

	return {
		autosends,
		startAutosend,
		stopAutosend
	};
});
