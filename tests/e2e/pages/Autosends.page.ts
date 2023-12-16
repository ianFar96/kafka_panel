import { AutosendOptions } from '../../../src/types/autosend.js';
import { click, e2eConnectionName, setValue, waitForLoaderToHide } from '../utils.js';

class AutosendsPage {
	get autosendsPageLink() { return $('aside a[href="#/autosend"]'); }
	get list() { return $('h2=Autosend').$('../..').$('//ul'); }
	get startAutosendModal() {return $('h2=Start autosend').$('..'); }

	async startAutosend(config: AutosendOptions, topicName: string) {
		const startAutosendButton = await $('button=Start autosend');
		await click(startAutosendButton);

		const durationInput = await this.startAutosendModal.$('span=Duration').$('../input[@type="number"]');
		await setValue(durationInput, config.duration.value);

		const durationSelect = await this.startAutosendModal.$('span=Duration').$('../div/label');
		await click(durationSelect);

		const durationSecondsOption = await durationSelect.$('..').$(`li=${config.duration.time_unit}`);
		await click(durationSecondsOption);

		const intervalInput = await this.startAutosendModal.$('span=Interval').$('../input[@type="number"]');
		await setValue(intervalInput, config.interval.value);

		const intervalSelect = await this.startAutosendModal.$('span=Interval').$('../div/label');
		await click(intervalSelect);

		const intervalSecondsOption = await intervalSelect.$('..').$(`li=${config.interval.time_unit}`);
		await click(intervalSecondsOption);

		let nextButton = await this.startAutosendModal.$('button=Next');
		await click(nextButton);

		const connectionItem = await this.startAutosendModal.$(`li=${e2eConnectionName}`);
		await click(connectionItem);

		const topicItem = await this.startAutosendModal.$(`li=${topicName}`);
		await click(topicItem);

		nextButton = await this.startAutosendModal.$('button=Next');
		await click(nextButton);

		const startButton = await this.startAutosendModal.$('button=Start');
		await click(startButton);

		await waitForLoaderToHide();
	}
}

export default new AutosendsPage();