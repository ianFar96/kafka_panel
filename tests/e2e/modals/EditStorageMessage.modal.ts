import { click, setValue, waitForLoaderToHide } from '../utils.js';

class EdtiStorageMessageModal {
	get modal() { return $('h2=Edit storage message').$('..'); }
	get tagsInput() { return this.modal.$('input[placeholder="Type the tag and press enter"]'); }
	get tagsList() { return this.tagsInput.$('../..').$$('ul li button'); }
	get addTagButton() { return this.modal.$('button[title="Add to tags"]'); }

	async edit(tags: string[]) {
		for (const tagChip of await this.tagsList) {
			await click(tagChip);
		}

		for (const tag of tags) {
			await setValue(await this.tagsInput, tag);
			await click(await this.addTagButton);
		}

		let nextButton = await this.modal.$('button=Next');
		await click(nextButton);

		nextButton = await this.modal.$('button=Next');
		await click(nextButton);

		const saveButton = await this.modal.$('button=Save');
		await click(saveButton);

		await waitForLoaderToHide();
	}
}

export default new EdtiStorageMessageModal();