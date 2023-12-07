import { click, waitForLoaderToHide } from '../utils.js';

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

	async waitUntilMessagesCount(elementsCount: number) {
		await browser.waitUntil(async () => {
			const listItems = await this.list.$$('li');
			return listItems.length === elementsCount;
		}, {timeout: 5000, timeoutMsg: `expected list to have exactly ${elementsCount} messages after 5s`});
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
}

export default new MessagesPage();