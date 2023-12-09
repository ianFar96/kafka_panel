import { click, setValue, waitForLoaderToHide } from '../utils.js';

class MessagesPage {
	get list() { return $('ul'); }

	async sendMessage(sentMessageIndex?: number) {
		if (sentMessageIndex === undefined) {
			const sendMessageButton = await $('button=Send message');
			await click(sendMessageButton);
		} else {
			const showMessageButton = await this.list.$(`//li[${sentMessageIndex + 1}]/div`);
			await click(showMessageButton);

			const sendAgainButton = await $('button[title="Send again"]');
			await click(sendAgainButton);
		}

		const nextButton = await $('button=Next');
		await click(nextButton);

		const sendButton = await $('button=Send');
		await click(sendButton);

		await waitForLoaderToHide();
	}

	async stopListener() {
		const stopButton = await $('button[title="Stop fetching"');
		await click(stopButton);

		await browser.waitUntil( () => $('button[title="Start fetching"]').isDisplayed());
	}

	async startListener() {
		const startButton = await $('button[title="Start fetching"');
		await click(startButton);

		await browser.waitUntil( () => $('button[title="Stop fetching"]').isDisplayed());
	}

	async saveMessage(sentMessageIndex: number, tags: string[]) {
		const showMessageButton = await this.list.$(`//li[${sentMessageIndex + 1}]/div`);
		await click(showMessageButton);

		const saveInStorageButton = await $('button[title="Save in storage"]');
		await click(saveInStorageButton);

		const tagsInput = await $('input[placeholder="Type the tag and press enter"]');
		const addTagButton = await $('button[title="Add to tags"]');
		for (const tag of tags) {
			await setValue(tagsInput, tag);
			await click(addTagButton);
		}

		const nextContentButton = await $('button=Next');
		await click(nextContentButton);

		const nextHeadersButton = await $('button=Next');
		await click(nextHeadersButton);

		const saveButton = await $('button=Save');
		await click(saveButton);
	}
}

export default new MessagesPage();