import AutosendsPage from '../pages/Autosends.page.js';
import MessagesPage from '../pages/Messages.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName } from '../utils.js';

describe('Autosends', () => {
	const topicName = 'autosends.default';

	it('should start autosend', async () => {
		await TopicsPage.selectConnection(e2eConnectionName);
		await TopicsPage.createTopic(topicName);

		await click(await AutosendsPage.autosendsPageLink);

		await AutosendsPage.startAutosend({
			duration:{
				value: 5,
				time_unit: 'Seconds'
			},
			interval: {
				value: 500,
				time_unit: 'Milliseconds'
			}
		},topicName);
		await expect(AutosendsPage.list).toHaveChildren(1);

		// A red circle should display the active autosend in the page link
		await expect(await AutosendsPage.autosendsPageLink.$('i=1')).toBeDisplayed();

		// Wait for the autosend to finish
		await browser.pause(5 * 1000);
		await expect(AutosendsPage.list).toHaveChildren(0);

		await click(await TopicsPage.topicsPageLink);
		await TopicsPage.goToMessages(topicName);

		// Messages should be 10 since 5secs / 500 milis = 10
		// But there's always a delay in sending the messages
		// So we consider the 50% sent is a success
		await expect(await MessagesPage.list).toHaveChildren({gte: 5});
	});
});
