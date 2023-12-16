import { click, setValue } from '../utils.js';

class MessagesStoragePage {
	get list() { return $('ul'); }
	get editModal() { return $('h2=Edit storage message').$('..'); }
	get editTagsInput() { return this.editModal.$('input[placeholder="Type the tag and press enter"]'); }
	get editTagsList() { return this.editTagsInput.$('../..').$$('ul li button'); }
	get addTagButton() { return this.editModal.$('button[title="Add to tags"]'); }

	getTagsList(index: number) {
		return this.list.$(`li:nth-child(${index + 1}) ul`);
	}

	async editMessage(messageIndex: number, tags: string[]) {
		const showMessageButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(showMessageButton);

		const editButton = await this.list.$('button[title="Edit tags and message"]');
		await click(editButton);

		for (const tagChip of await this.editTagsList) {
			await click(tagChip);
		}

		for (const tag of tags) {
			await setValue(await this.editTagsInput, tag);
			await click(await this.addTagButton);
		}

		let nextButton = await this.editModal.$('button=Next');
		await click(nextButton);

		nextButton = await this.editModal.$('button=Next');
		await click(nextButton);

		const saveButton = await this.editModal.$('button=Save');
		await click(saveButton);
	}
}

export default new MessagesStoragePage();