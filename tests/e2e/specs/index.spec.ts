import TopicsPage from '../pages/Topics.page.js';
import { e2eConnectionName, sleep } from '../utils.js';

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
		const topicNameCell = await TopicsPage.getCell(topicRow, 'name');
		expect(topicNameCell).toBeDisplayed();
		const topicPartitionsCell = await TopicsPage.getCell(topicRow, 'partitions');
		expect(topicPartitionsCell).toHaveValue(topicPartitions.toString());
	});

	it('should delete the topic', async () => {
		await TopicsPage.deleteTopic(topicName);
		await sleep(100);

		const topicsTableRows = await TopicsPage.topicsTable.$$('tbody tr');
		expect(topicsTableRows.length).toBe(0);
	});
});
