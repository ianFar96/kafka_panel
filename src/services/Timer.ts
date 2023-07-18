import { DateTime, Duration } from 'luxon';
import { BehaviorSubject } from 'rxjs';

export type TimerCallback = () => Promise<unknown> | unknown

export class Timer {
	private startTime: DateTime;
	private interval?: NodeJS.Timer;
	private callbacks: TimerCallback[] = [];

	private _remaining: BehaviorSubject<Duration>;
	get remaining() {
		return this._remaining;
	}

	constructor(duration: Duration) {
		this.startTime = DateTime.now().plus(duration);
		this._remaining = new BehaviorSubject(this.startTime.diffNow('seconds'));
	}

	start() {
		if (!this.interval) {
			this.interval = setInterval(async () => {
				this._remaining.next(this.startTime.diffNow('seconds'));

				if (Math.floor(this._remaining.value.seconds) <= 0) {
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