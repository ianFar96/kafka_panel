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
}

export default new MessagesPage();