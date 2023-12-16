import MessagesPage from '../pages/Messages.page.js';
import MessagesStoragePage from '../pages/MessagesStorage.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName } from '../utils.js';

describe('Storage', () => {
	it('should save a message to the storage', async () => {
		const topicName = 'storage.save.message';
		await TopicsPage.selectConnection(e2eConnectionName);
		await TopicsPage.createTopic(topicName);
		await TopicsPage.goToMessages(topicName);

		await MessagesPage.sendMessage();
		const tags = ['first-tag', 'second-tag'];
		await MessagesPage.saveMessage(0, tags);

		const messagesStorageLink = await $('a[title="Messages storage"]');
		await click(messagesStorageLink);

		await expect(await MessagesStoragePage.list).toHaveChildren(1);

		const tagsList = await MessagesStoragePage.getTagsList(0);
		await expect(tagsList).toHaveChildren(tags.length);

		for (const tag of tags) {
			await expect(await tagsList.$(`button=${tag}`)).toBeDisplayed();
		}
	});

	it('should edit the message', async () => {
		const tags = ['new-tag'];
		await MessagesStoragePage.editMessage(0, tags);

		const tagsList = await MessagesStoragePage.getTagsList(0);
		await expect(tagsList).toHaveChildren(tags.length);

		for (const tag of tags) {
			await expect(await tagsList.$(`button=${tag}`)).toBeDisplayed();
		}
	});
});
