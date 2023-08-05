import { DateTime, Duration } from 'luxon';
import { BehaviorSubject } from 'rxjs';

export type TimerCallback = () => Promise<unknown> | unknown

export class Timer {
	private startTime: DateTime;
	private interval?: NodeJS.Timer;
	private callbacks: TimerCallback[] = [];

	private remainingSubject: BehaviorSubject<Duration>;
	get remainingObservable() {
		return this.remainingSubject.asObservable();
	}

	constructor(duration: Duration) {
		this.startTime = DateTime.now().plus(duration);
		this.remainingSubject = new BehaviorSubject(this.startTime.diffNow('seconds'));
	}

	start() {
		if (!this.interval) {
			this.interval = setInterval(async () => {
				this.remainingSubject.next(this.startTime.diffNow('seconds'));

				if (Math.floor(this.remainingSubject.value.seconds) <= 0) {
					this.stop();

					for (const callback of this.callbacks) {
						await callback();
					}
					this.callbacks = [];
				}
			}, 1000);
		}
	}

	async stop() {
		clearInterval(this.interval);
		this.interval = undefined;
	}

	onFinish(callback: TimerCallback) {
		this.callbacks.push(callback);
	}
}