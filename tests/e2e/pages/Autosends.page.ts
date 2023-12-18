import { AutosendOptions } from '../../../src/types/autosend.js';
import EditStorageMessageModal from '../modals/EditStorageMessage.modal.js';
import StartAutosendModal from '../modals/StartAutosend.modal.js';
import { click, setValue, waitForLoaderToHide } from '../utils.js';

class AutosendsPage {
	get pageLink() { return $('aside a[href="#/autosend"]'); }
	get list() { return $('h2=Autosend').$('../..').$('//ul'); }
	get searchInput() { return $('input[placeholder="Search by topic"]'); }

	async startAutosend(config: AutosendOptions, topicName: string) {
		const startAutosendButton = await $('button=Start autosend');
		await click(startAutosendButton);

		await StartAutosendModal.startAutosend(config, topicName);

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