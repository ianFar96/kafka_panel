import { AutosendOptions } from '../../../src/types/autosend.js';
import EditStorageMessageModal from '../modals/EditStorageMessage.modal.js';
import { click, e2eConnectionName, setValue, waitForLoaderToHide } from '../utils.js';

class AutosendsPage {
	get pageLink() { return $('aside a[href="#/autosend"]'); }
	get list() { return $('h2=Autosend').$('../..').$('//ul'); }
	get searchInput() { return $('input[placeholder="Search by topic"]'); }
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

	async stopAutosend(autosendIndex: number) {
		const toggleAutosendContentButton = await this.list.$(`//li[${autosendIndex + 1}]/div`);
		await click(toggleAutosendContentButton);

		const stopButton = await this.list.$('button[title="Stop"]');
		await click(stopButton);
	}

	async search(searchString: string) {
		await setValue(await this.searchInput, searchString);
	}

	async saveAutosend(autosendIndex: number, tags: string[]) {
		const toggleAutosendContentButton = await this.list.$(`//li[${autosendIndex + 1}]/div`);
		await click(toggleAutosendContentButton);

		const saveInStorageButton = await this.list.$('button[title="Save in storage"]');
		await click(saveInStorageButton);

		await EditStorageMessageModal.edit(tags);

		// Hide message content so this action
		// can be called immediately after if needed
		await click(toggleAutosendContentButton);
	}
}

export default new AutosendsPage();