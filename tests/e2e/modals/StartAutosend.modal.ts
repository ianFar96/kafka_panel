import { AutosendOptions } from '../../../src/types/autosend.js';
import { click, e2eConnectionName, setValue } from '../utils.js';

class StartAutosendModal {
	get modal() { return $('h2=Start autosend').$('..'); }

	async startAutosend(config: AutosendOptions, topicName: string) {
		const durationInput = await this.modal.$('span=Duration').$('../input[@type="number"]');
		await setValue(durationInput, config.duration.value);

		const durationSelect = await this.modal.$('span=Duration').$('../div/label');
		await click(durationSelect);

		const durationSecondsOption = await durationSelect.$('..').$(`li=${config.duration.time_unit}`);
		await click(durationSecondsOption);

		const intervalInput = await this.modal.$('span=Interval').$('../input[@type="number"]');
		await setValue(intervalInput, config.interval.value);

		const intervalSelect = await this.modal.$('span=Interval').$('../div/label');
		await click(intervalSelect);

		const intervalSecondsOption = await intervalSelect.$('..').$(`li=${config.interval.time_unit}`);
		await click(intervalSecondsOption);

		let nextButton = await this.modal.$('button=Next');
		await click(nextButton);

		const connectionItem = await this.modal.$(`li=${e2eConnectionName}`);
		await click(connectionItem);

		const topicItem = await this.modal.$(`li=${topicName}`);
		await click(topicItem);

		nextButton = await this.modal.$('button=Next');
		await click(nextButton);

		const startButton = await this.modal.$('button=Start');
		await click(startButton);

	}
}

export default new StartAutosendModal();