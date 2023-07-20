import { faker } from '@faker-js/faker';
import { clone } from 'ramda';
import { ActiveAutosend, AutosendTime } from '../types/autosend';
import kafkaService from './kafka';
import { Subject } from 'rxjs';
import { Timer } from './Timer';
import { Duration } from 'luxon';

class AutosendsService {
	private intervals: Record<string, NodeJS.Timer> = {};

	startAutosend(autosend: ActiveAutosend) {
		const messagesCounter = new Subject<number>();

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
				// TODO: avoid this clone
				const interpolatedKey = this.interpolateFakeValues(clone(autosend.key), {faker});
				const interpolatedValue = this.interpolateFakeValues(clone(autosend.value), {faker, key: interpolatedKey});

				kafkaService.sendMessage(
					autosend.topic,
					JSON.stringify(interpolatedKey),
					JSON.stringify(interpolatedValue)
				).then(() => {
					messagesSent += 1;
					messagesCounter.next(messagesSent);
				});
			} catch (error) {
				messagesCounter.error(error);
				this.stopAutosend(autosend);
			}
		}, interval.as('milliseconds'), autosend);

		return {
			messagesSent: messagesCounter.asObservable(),
			timer: timer.remaining
		};
	}

	stopAutosend(autosend: ActiveAutosend) {
		clearInterval(this.intervals[autosend.id]);
	}

	private interpolateFakeValues(input: unknown, context: unknown) {
		if (typeof input === 'object') {
			if (Array.isArray(input)) {
				for (const key in input) {
					input[key] = this.interpolateFakeValues(input[key], context);
				}
			} else if (input !== null) {
				for (const key of Object.keys(input)) {
					const obj = input as Record<string, unknown>;
					obj[key] = this.interpolateFakeValues(obj[key], context);
				}
			}
		} else if (typeof input === 'string') {
			input = input.replace(/\{\{(.*?)\}\}/gm, (_, group) => {
				try {
					return this.scopeEval(context, `this.${group}`).toString();
				} catch (error) {
					throw new Error(`Interpolation error with "${group}"\n${error}`);
				}
			});
		}

		return input;
	}

	private scopeEval(scope: unknown, script: string) {
		return Function('"use strict";return (' + script + ')').bind(scope)();
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