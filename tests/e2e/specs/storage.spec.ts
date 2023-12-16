import MessagesPage from '../pages/Messages.page.js';
import MessagesStoragePage from '../pages/MessagesStorage.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName, setValue } from '../utils.js';

describe('Storage', () => {
	const topicName = 'storage.default';

	it('should save a message to the storage', async () => {
		await TopicsPage.selectConnection(e2eConnectionName);
		await TopicsPage.createTopic(topicName);
		await TopicsPage.goToMessages(topicName);

		await MessagesPage.sendMessage();
		const tags = ['first-tag', 'second-tag'];
		await MessagesPage.saveMessage(0, tags);

		await click(await MessagesStoragePage.messagesStoragePageLink);

		await expect(await MessagesStoragePage.list).toHaveChildren(1);

		const tagsList = await MessagesStoragePage.getTagsList(0);
		await expect(tagsList).toHaveChildren(tags.length);

		for (const tag of tags) {
			await expect(await tagsList.$(`button=${tag}`)).toBeDisplayed();
		}
	});

	it('should search by tag', async () => {
		await click(await TopicsPage.topicsPageLink);
		await TopicsPage.goToMessages(topicName);

		// Save the same message with other tags
		const tags = ['second-tag', 'third-tag'];
		await MessagesPage.saveMessage(0, tags);

		await click(await MessagesStoragePage.messagesStoragePageLink);
		await expect(await MessagesStoragePage.list).toHaveChildren(2);

		await setValue(await MessagesStoragePage.searchInput, 'no-tag');
		await expect(await MessagesStoragePage.list).toHaveChildren(0);

		await setValue(await MessagesStoragePage.searchInput, 'first-tag');
		await expect(await MessagesStoragePage.list).toHaveChildren(1);

		await setValue(await MessagesStoragePage.searchInput, 'second-tag');
		await expect(await MessagesStoragePage.list).toHaveChildren(2);

		// Clean search bar
		await setValue(await MessagesStoragePage.searchInput, '');
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

	it('should send the message again', async () => {
		await MessagesStoragePage.sendMessage(0, topicName);

		await click(await TopicsPage.topicsPageLink);

		await TopicsPage.goToMessages(topicName);
		await expect(await MessagesPage.list).toHaveChildren(2);
	});
});
