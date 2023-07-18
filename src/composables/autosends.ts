import { Duration } from 'luxon';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Timer } from '../services/Timer';
import { ActiveAutosend, Autosend, AutosendTime } from '../types/autosend';

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
	case 'Miliseconds':
		duration = Duration.fromObject({milliseconds: time.value});
		break;
	}

	const timer = new Timer(duration);
	return timer;
}

export const useAutosendsStore = defineStore('autosends', () => {
	const autosends = ref<ActiveAutosend[]>([]);

	async function startAutosend(autosend: Autosend) {
		// TODO: uncomment this when UI is ready
		// const id = await invoke('start_autosend_command', autosend);
		const id = Math.floor(Math.random() * 10).toString();

		const timer = createAutosendTimer(autosend.options.duration);
		timer.start();

		const activeAutosend: ActiveAutosend = {
			...autosend,
			timer,
			id,
		};

		activeAutosend.timer.onFinish(async () => {
			removeAutosendFromStore(activeAutosend);
		});

		autosends.value.push(activeAutosend);
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		await autosend.timer.stop();
		removeAutosendFromStore(autosend);
	}

	const removeAutosendFromStore = (autosend: ActiveAutosend) => {
		// TODO: uncomment this when UI is ready
		// await invoke('stop_autosend_command', { id: autosend.id });
		const index = autosends.value.findIndex(autosendTmp => autosendTmp.id === autosend.id);
		autosends.value.splice(index, 1);
	};

	return {
		autosends,
		startAutosend,
		stopAutosend
	};
});
