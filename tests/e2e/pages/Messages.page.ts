import EditStorageMessageModal from '../modals/EditStorageMessage.modal.js';
import { click, waitForLoaderToHide } from '../utils.js';

class MessagesPage {
	get list() { return $('h2*=messages').$('../..').$('//ul'); }

	async sendMessage(sentMessageIndex?: number) {
		let toggleMessageContentButton;
		if (sentMessageIndex === undefined) {
			const sendMessageButton = await $('button=Send message');
			await click(sendMessageButton);
		} else {
			toggleMessageContentButton = await this.list.$(`//li[${sentMessageIndex + 1}]/div`);
			await click(toggleMessageContentButton);

			const sendAgainButton = await $('button[title="Send again"]');
			await click(sendAgainButton);
		}

		const nextButton = await $('button=Next');
		await click(nextButton);

		const sendButton = await $('button=Send');
		await click(sendButton);

		await waitForLoaderToHide();

		// Hide message content so this action
		// can be called immediately after if needed
		if (toggleMessageContentButton) {
			await click(toggleMessageContentButton);
		}
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
		const toggleMessageContentButton = await this.list.$(`//li[${sentMessageIndex + 1}]/div`);
		await click(toggleMessageContentButton);

		const saveInStorageButton = await $('button[title="Save in storage"]');
		await click(saveInStorageButton);

		await EditStorageMessageModal.edit(tags);

		// Hide message content so this action
		// can be called immediately after if needed
		await click(toggleMessageContentButton);
	}
}

export default new MessagesPage();