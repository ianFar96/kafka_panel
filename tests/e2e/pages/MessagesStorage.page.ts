import EditStorageMessageModal from '../modals/EditStorageMessage.modal.js';
import { click, e2eConnectionName, setValue, waitForLoaderToHide } from '../utils.js';

class MessagesStoragePage {
	get pageLink() { return $('aside a[href="#/messages-storage"]'); }
	get searchInput() { return $('input[placeholder="Search by tags"]'); }
	get list() { return $('h2=Messages Storage').$('../..').$('//ul'); }
	get sendMessageModal() { return $('h2=Send storage message').$('..'); }

	getTagsList(index: number) {
		return this.list.$(`li:nth-child(${index + 1}) ul`);
	}

	async editMessage(messageIndex: number, tags: string[]) {
		const toggleMessageContentButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(toggleMessageContentButton);

		const editButton = await this.list.$('button[title="Edit tags and message"]');
		await click(editButton);

		await EditStorageMessageModal.edit(tags);

		await waitForLoaderToHide();
	}

	async deleteMessage(messageIndex: number) {
		const toggleMessageContentButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(toggleMessageContentButton);

		const deleteButton = await this.list.$('button[title="Delete message"]');
		await click(deleteButton);

		const acceptButton = await $('button=Accept');
		await click(acceptButton);

		await waitForLoaderToHide();
	}

	async search(searchString: string) {
		await setValue(await this.searchInput, searchString);
	}

	async sendMessage(messageIndex: number, topicName: string) {
		const toggleMessageContentButton = await this.list.$(`//li[${messageIndex + 1}]/div`);
		await click(toggleMessageContentButton);

		const editButton = await this.list.$('button[title="Send again"]');
		await click(editButton);

		const connectionItem = await this.sendMessageModal.$(`li=${e2eConnectionName}`);
		await click(connectionItem);

		const topicItem = await this.sendMessageModal.$(`li=${topicName}`);
		await click(topicItem);

		// Accept current message
		const nextButton = await this.sendMessageModal.$('button=Next');
		await click(nextButton);

		// Accept current headers
		const sendButton = await this.sendMessageModal.$('button=Send');
		await click(sendButton);

		await waitForLoaderToHide();

		// Hide message content so this action
		// can be called immediately after if needed
		await click(toggleMessageContentButton);
	}
}

export default new MessagesStoragePage();