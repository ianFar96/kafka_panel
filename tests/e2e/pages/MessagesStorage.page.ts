import { click, setValue } from '../utils.js';

class MessagesStoragePage {
	get list() { return $('h2=Messages Storage').$('../..').$('//ul'); }
	edit = {
		get modal() { return $('h2=Edit storage message').$('..'); },
		get tagsInput() { return this.modal.$('input[placeholder="Type the tag and press enter"]'); },
		get tagsList() { return this.tagsInput.$('../..').$$('ul li button'); },
		get addTagButton() { return this.modal.$('button[title="Add to tags"]'); }
	};
	sendAgain = {
		get modal() { return $('h2=Send storage message').$('..'); },
	};

	getTagsList(index: number) {
		return this.list.$(`li:nth-child(${index + 1}) ul`);
	}

	async editMessage(messageIndex: number, tags: string[]) {
		const showMessageButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(showMessageButton);

		const editButton = await this.list.$('button[title="Edit tags and message"]');
		await click(editButton);

		for (const tagChip of await this.edit.tagsList) {
			await click(tagChip);
		}

		for (const tag of tags) {
			await setValue(await this.edit.tagsInput, tag);
			await click(await this.edit.addTagButton);
		}

		let nextButton = await this.edit.modal.$('button=Next');
		await click(nextButton);

		nextButton = await this.edit.modal.$('button=Next');
		await click(nextButton);

		const saveButton = await this.edit.modal.$('button=Save');
		await click(saveButton);
	}

	async sendMessage(messageIndex: number, topicName: string) {
		const showMessageButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(showMessageButton);

		const editButton = await this.list.$('button[title="Send again"]');
		await click(editButton);

		// Accept default connection
		let nextButton = await this.sendAgain.modal.$('button=Next');
		await click(nextButton);

		const topic = await this.sendAgain.modal.$(`li=${topicName}`);
		await click(topic);

		// Accept current message
		nextButton = await this.sendAgain.modal.$('button=Next');
		await click(nextButton);

		// Accept current headers
		const sendButton = await this.sendAgain.modal.$('button=Send');
		await click(sendButton);
	}
}

export default new MessagesStoragePage();