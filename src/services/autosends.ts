import { Duration } from 'luxon';
import { BehaviorSubject } from 'rxjs';
import { ActiveAutosend, AutosendTime } from '../types/autosend';
import kafkaService from './kafka';
import { Timer } from './Timer';

class AutosendsService {
	private intervals: Record<string, NodeJS.Timer> = {};

	startAutosend(autosend: ActiveAutosend) {
		const messagesCounter = new BehaviorSubject<number>(0);

		const duration = this.castAutosendTimeToDuration(autosend.options.duration);
		const timer = new Timer(duration);
		timer.start();
		timer.onFinish(() => {
			this.stopAutosend(autosend);
		});

		let messagesSent = 0;
    
		const interval = this.castAutosendTimeToDuration(autosend.options.interval);
		this.intervals[autosend.id] = setInterval((autosend: ActiveAutosend) => {
			try {
				kafkaService.sendMessage(autosend.topic, {
					headers: autosend.headers,
					key: autosend.key,
					value: autosend.value
				})
					.then(() => {
						messagesSent += 1;
						messagesCounter.next(messagesSent);
					});
			} catch (error) {
				messagesCounter.error(error);
				this.stopAutosend(autosend);
			}
		}, interval.as('milliseconds'), autosend);

		return {
			messagesSentObservable: messagesCounter.asObservable(),
			remainingTimeObservable: timer.remainingObservable,
			onFinish: timer.onFinish.bind(timer)
		};
	}

	stopAutosend(autosend: ActiveAutosend) {
		clearInterval(this.intervals[autosend.id]);
	}

	private castAutosendTimeToDuration(time: AutosendTime) {
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
}

const autosendsService = new AutosendsService();

export default autosendsService;