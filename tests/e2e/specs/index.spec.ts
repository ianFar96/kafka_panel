import MessagesPage from '../pages/Messages.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName } from '../utils.js';

const topicName = 'topic.e2e.test';

describe('Topics', () => {
	it('should see topics list', async () => {
		await expect(TopicsPage.chooseConnectionTitle).toBeDisplayed();
		await TopicsPage.selectConnection(e2eConnectionName);

		await expect(TopicsPage.getTitle(e2eConnectionName)).toBeDisplayed();
	});

	it('should create a new topic', async () => {
		const topicPartitions = 5;
		await TopicsPage.createTopic(topicName, topicPartitions);

		const topicRow = await TopicsPage.getRow(topicName);
		const topicPartitionsCell = await TopicsPage.getCell(topicRow, 'partitions');
		await expect(topicPartitionsCell).toHaveText(topicPartitions.toString());
	});

	it('should delete the topic', async () => {
		await TopicsPage.deleteTopic(topicName);

		const topicsTableRows = await TopicsPage.topicsTable.$$('tbody tr');
		await expect(topicsTableRows).toHaveLength(0);
	});
});

describe('Messages', () => {
	it('should send a message', async () => {
		await TopicsPage.createTopic(topicName);

		const topicRow = await TopicsPage.getRow(topicName);
		const messagesLink = await topicRow.$('a[title=Messages]');
		await click(messagesLink);

		const listItems = await MessagesPage.list.$$('li');
		await expect(listItems).toHaveLength(0);

		await MessagesPage.sendMessage();

		await browser.waitUntil(async () => {
			const listItems = await MessagesPage.list.$$('li');
			return listItems.length === 1;
		}, {timeout: 5000, timeoutMsg: 'expected list to have exactly one message after 5s'});
	});
});
