import { click, waitForLoaderToHide } from '../utils.js';

class MessagesPage {
	get list() { return $('ul'); }

	async sendMessage() {
		const sendMessageButton = await $('button=Send message');
		await click(sendMessageButton);

		const nextButton = await $('button=Next');
		await click(nextButton);

		const sendButton = await $('button=Send');
		await click(sendButton);

		await waitForLoaderToHide();
	}
}

export default new MessagesPage();