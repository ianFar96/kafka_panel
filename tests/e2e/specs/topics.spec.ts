import TopicsPage from '../pages/Topics.page.js';
import { e2eConnectionName } from '../utils.js';

describe('Topics', () => {
	it('should see topics list', async () => {
		await expect(TopicsPage.chooseConnectionTitle).toBeDisplayed();
		await TopicsPage.selectConnection(e2eConnectionName);

		await expect(TopicsPage.getTitle(e2eConnectionName)).toBeDisplayed();
	});

	it('should create a new topic', async () => {
		const topicName = 'topic.e2e.test';
		const topicPartitions = 5;
		await TopicsPage.createTopic(topicName, topicPartitions);

		const createdTopicNameCell = await $('table').$(`td=${topicName}`);
		expect(createdTopicNameCell).toBeDisplayed();
		const createdTopicPartitionsCell = await createdTopicNameCell.$('../td[2]');
		expect(createdTopicPartitionsCell).toHaveValue(topicPartitions.toString());
	});
});
