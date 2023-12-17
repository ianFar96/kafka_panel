import AutosendsPage from '../pages/Autosends.page.js';
import MessagesPage from '../pages/Messages.page.js';
import SettingsPage from '../pages/Settings.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName } from '../utils.js';

describe('Settings', () => {
	it('should update number of messages and work as expected', async () => {
		const topicName = 'settings.update.numeberOfMessages';
		await click(await TopicsPage.pageLink);
		await TopicsPage.selectConnection(e2eConnectionName);
		await TopicsPage.createTopic(topicName);

		await click(await AutosendsPage.pageLink);
		AutosendsPage.startAutosend({
			duration: {
				value: 5,
				time_unit: 'Seconds'
			},
			interval: {
				value: 10,
				time_unit: 'Milliseconds'
			}
		}, topicName);
		// Let the autosend flood the topic
		await browser.pause(5 * 1000);

		await click(await SettingsPage.pageLink);
		await SettingsPage.updateNumberOfMessages(5);
		await click(await TopicsPage.pageLink);
		await TopicsPage.goToMessages(topicName);
		await expect(await MessagesPage.list).toHaveChildren(5);

		await click(await SettingsPage.pageLink);
		await SettingsPage.updateNumberOfMessages(20);
		await click(await TopicsPage.pageLink);
		await TopicsPage.goToMessages(topicName);
		await expect(await MessagesPage.list).toHaveChildren(20);

		// Check that with a bigger limit it shows less elements than the limit
		await click(await SettingsPage.pageLink);
		await SettingsPage.updateNumberOfMessages(1000);
		await click(await TopicsPage.pageLink);
		await TopicsPage.goToMessages(topicName);
		// Wait for all the messages to be pulled
		await browser.pause(3 * 1000);
		await expect(await MessagesPage.list).toHaveChildren({lte: 500});
	});
});
