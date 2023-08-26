import { faker } from '@faker-js/faker';
import { clone } from 'ramda';
import { ActiveAutosend, AutosendTime } from '../types/autosend';
import kafkaService from './kafka';
import { BehaviorSubject } from 'rxjs';
import { Timer } from './Timer';
import { Duration } from 'luxon';
import { MessageContent } from '../types/message';

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
				const interpolatedHeaders = this.interpolateFakeValues(clone(autosend.headers), {faker});
				const interpolatedKey = this.interpolateFakeValues(clone(autosend.key), {faker});
				const interpolatedValue = this.interpolateFakeValues(clone(autosend.value), {faker, key: interpolatedKey});

				const messageContent: MessageContent = {
					headers: interpolatedHeaders,
					key: interpolatedKey,
					value: interpolatedValue
				};

				kafkaService.sendMessage(autosend.topic, messageContent)
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

	private interpolateFakeValues<T = unknown>(input: T, context: Record<string, unknown>): T {
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
			(input as string) = input.replace(/\{\{(.*?)\}\}/gm, (_, group) => {
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