import { ref } from 'vue';
import { ActiveAutosend, Autosend, AutosendTime } from '../types/autosend';
import { Duration } from 'luxon';
import { Timer } from '../services/Timer';

function getAutosendTimer(time: AutosendTime) {
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

export function useAutosends() {
	const autosends = ref<ActiveAutosend[]>([]);

	async function startAutosend(autosend: Autosend) {
		// TODO: uncomment this when UI is ready
		const id = 'someID';
		// const id = await invoke('start_autosend_command', autosend);

		const timer = getAutosendTimer(autosend.options.duration);
		timer.start();

		const activeAutosend: ActiveAutosend = {
			...autosend,
			timer,
			id,
		};

		activeAutosend.timer.onEnd(async () => {
			await stopAutosend(activeAutosend);
		});

		autosends.value.push(activeAutosend);
	}

	async function stopAutosend(autosend: ActiveAutosend) {
		// TODO: uncomment this when UI is ready
		// await invoke('stop_autosend_command', { topic });
		await autosend.timer.stop();
		const index = autosends.value.findIndex(autosend => autosend.id === autosend.id);
		autosends.value = autosends.value.splice(index, 1);
	}

	return {
		autosends,
		startAutosend,
		stopAutosend
	};
}