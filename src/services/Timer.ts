import { DateTime, Duration } from 'luxon';

export type TimerCallback = () => Promise<unknown> | unknown

export class Timer {
	private startTime: DateTime;
	private interval?: NodeJS.Timer;
	private callbacks: TimerCallback[] = [];

	private _remaining: Duration;
	private remainingDisplayRef: string;
	get remaining() {
		return this.remainingDisplayRef;
	}

	constructor(duration: Duration) {
		this.startTime = DateTime.now().plus(duration);
		this._remaining = this.startTime.diffNow('seconds');
		this.remainingDisplayRef = this._remaining.toFormat('hh::mm:ss');
	}

	start() {
		if (!this.interval) {
			this.interval = setInterval(async () => {
				this._remaining = this.startTime.diffNow('seconds');
				this.remainingDisplayRef = this._remaining.toFormat('hh::mm:ss');
				if (Math.floor(this._remaining.seconds) <= 0) {
					clearInterval(this.interval);

					for (const callback of this.callbacks) {
						await callback();
					}
				}
			}, 1000);
		}
	}

	async stop() {
		clearInterval(this.interval);
		this.interval = undefined;

		for (const callback of this.callbacks) {
			await callback();
		}
	}

	onEnd(callback: TimerCallback) {
		this.callbacks.push(callback);
	}
}