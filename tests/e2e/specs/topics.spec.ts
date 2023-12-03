import TopicsPage from '../pages/Topics.page.js';
import { sleep } from '../utils.js';

const connectionName = 'Localhost';

describe('Topics', () => {
	it('should see topics list', async () => {
		await expect(TopicsPage.chooseConnectionTitle).toBeDisplayed();
		await TopicsPage.selectConnection(connectionName);

		await expect(TopicsPage.getTitle(connectionName)).toBeDisplayed();
	});

	it('should create a new topic', async () => {
		const topicName = 'topic.e2e.test';
		await TopicsPage.createTopic(topicName);

		const createdTopic = await $('table').$(`td=${topicName}`);
		expect(createdTopic).toBeDisabled();

		sleep();
	});
});
