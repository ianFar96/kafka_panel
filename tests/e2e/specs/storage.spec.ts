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
		await MessagesPage.saveMessage(0, ['first-tag', 'second-tag']);

		const messagesStorageLink = await $('a[title="Messages storage"]');
		await click(messagesStorageLink);

		await expect(await MessagesStoragePage.list).toHaveChildren(1);
	});
});
