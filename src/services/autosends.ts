import { faker } from '@faker-js/faker';
import { clone } from 'ramda';
import { castAutosendTimeToDuration } from '../composables/autosends';
import { ActiveAutosend } from '../types/autosend';
import kafkaService from './kafka';
import { Subject } from 'rxjs';

class AutosendsService {
	private intervals: Record<string, NodeJS.Timer> = {};

	startAutosend(autosend: ActiveAutosend) {
		const subject = new Subject<void>();
    
		const interval = castAutosendTimeToDuration(autosend.options.interval);
		this.intervals[autosend.id] = setInterval((autosend: ActiveAutosend) => {
			try {
				const interpolatedKey = this.interpolateFakeValues(clone(autosend.key));
				const interpolatedValue = this.interpolateFakeValues(clone(autosend.value));

				kafkaService.sendMessage(
					autosend.topic,
					JSON.stringify(interpolatedKey),
					JSON.stringify(interpolatedValue)
				).then(() => {
					subject.next();
				});
			} catch (error) {
				subject.error(error);
			}
		}, interval.as('milliseconds'), autosend);

		return subject.asObservable();
	}

	stopAutosend(autosend: ActiveAutosend) {
		clearInterval(this.intervals[autosend.id]);
	}

	private interpolateFakeValues(input: unknown) {
		if (typeof input === 'object') {
			if (Array.isArray(input)) {
				for (const key in input) {
					input[key] = this.interpolateFakeValues(input[key]);
				}
			} else if (input !== null) {
				for (const key of Object.keys(input)) {
					const obj = input as Record<string, unknown>;
					obj[key] = this.interpolateFakeValues(obj[key]);
				}
			}
		} else if (typeof input === 'string') {
			input = input.replace(/\{\{(.*?)\}\}/gm, (_, group) => {
				try {
					return this.scopeEval({faker}, `this.faker.${group}`).toString();
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
}

const autosendsService = new AutosendsService();

export default autosendsService;