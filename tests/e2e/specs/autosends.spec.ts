import AutosendsPage from '../pages/Autosends.page.js';
import MessagesPage from '../pages/Messages.page.js';
import MessagesStoragePage from '../pages/MessagesStorage.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName } from '../utils.js';

describe('Autosends', () => {
	it('should start autosend', async () => {
		const topicName = 'autosends.start.autosend';
		await TopicsPage.selectConnection(e2eConnectionName);
		await TopicsPage.createTopic(topicName);

		await click(await AutosendsPage.pageLink);

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
		await expect(await AutosendsPage.pageLink.$('i=1')).toBeDisplayed();

		// Wait for the autosend to finish
		await browser.pause(5 * 1000);
		await expect(AutosendsPage.list).toHaveChildren(0);

		await click(await TopicsPage.pageLink);
		await TopicsPage.goToMessages(topicName);

		// Messages should be 10 since 5secs / 500 milis = 10
		// But there's always a delay in sending the messages
		// So we consider the 50% sent is a success
		await expect(await MessagesPage.list).toHaveChildren({gte: 5});
	});

	it('should stop autosend', async () => {
		const topicName = 'autosends.stop.autosend';
		await click(await TopicsPage.pageLink);
		await TopicsPage.createTopic(topicName);

		await click(await AutosendsPage.pageLink);

		await AutosendsPage.startAutosend({
			duration:{
				value: 5,
				time_unit: 'Minutes'
			},
			interval: {
				value: 500,
				time_unit: 'Milliseconds'
			}
		}, topicName);
		await expect(AutosendsPage.list).toHaveChildren(1);

		// Wait a few seconds so it sends some messages
		await browser.pause(5 * 1000);

		await AutosendsPage.stopAutosend(0);
		await expect(AutosendsPage.list).toHaveChildren(0);

		await click(await TopicsPage.pageLink);
		await TopicsPage.goToMessages(topicName);

		// Wait a few seconds to be sure no new messages are comming
		await browser.pause(5 * 1000);

		// Messages should be at most 10 since 5secs / 500 milis = 10
		// But since it takes a moment to stop the autosend
		// We consider a 50% margin of error
		await expect(await MessagesPage.list).toHaveChildren({lte: 15});
	});

	it('should search', async () => {
		await click(await TopicsPage.pageLink);

		const topicName1 = 'autosends.search.1';
		await TopicsPage.createTopic(topicName1);

		const topicName2 = 'autosends.search.2';
		await TopicsPage.createTopic(topicName2);

		await click(await AutosendsPage.pageLink);

		await AutosendsPage.startAutosend({
			duration:{
				value: 5,
				time_unit: 'Minutes'
			},
			interval: {
				value: 5,
				time_unit: 'Seconds'
			}
		}, topicName1);
		await expect(AutosendsPage.list).toHaveChildren(1);

		await AutosendsPage.startAutosend({
			duration:{
				value: 5,
				time_unit: 'Minutes'
			},
			interval: {
				value: 5,
				time_unit: 'Seconds'
			}
		}, topicName2);
		await expect(AutosendsPage.list).toHaveChildren(2);

		await AutosendsPage.search(topicName1);
		await expect(AutosendsPage.list).toHaveChildren(1);
		await AutosendsPage.search('.search.');
		await expect(AutosendsPage.list).toHaveChildren(2);

		// Clean up
		await AutosendsPage.search('');
		await AutosendsPage.stopAutosend(0);
		await AutosendsPage.stopAutosend(0);
	});

	it('should save an autosend in storage', async () => {
		await click(await TopicsPage.pageLink);

		const topicName = 'autosends.save.storage';
		await TopicsPage.createTopic(topicName);

		await click(await AutosendsPage.pageLink);
		await AutosendsPage.startAutosend({
			duration:{
				value: 5,
				time_unit: 'Minutes'
			},
			interval: {
				value: 5,
				time_unit: 'Seconds'
			}
		}, topicName);

		const tags = ['first-tag', 'second-tag'];
		await AutosendsPage.saveAutosend(0, tags);

		// Cleanup
		await AutosendsPage.stopAutosend(0);

		await click(await MessagesStoragePage.pageLink);
		await expect(MessagesStoragePage.list).toHaveChildren(1);
	});

	it('should start the autosend from the storage', async () => {
		await click(await TopicsPage.pageLink);

		const topicName = 'autosends.start.autosend.storage';
		await TopicsPage.createTopic(topicName);

		await click(await MessagesStoragePage.pageLink);
		await MessagesStoragePage.startAutosend(0, {
			duration:{
				value: 5,
				time_unit: 'Minutes'
			},
			interval: {
				value: 5,
				time_unit: 'Seconds'
			}
		}, topicName);

		await expect(await AutosendsPage.pageLink.$('i=1')).toBeDisplayed();

		await click(await AutosendsPage.pageLink);
		await expect(AutosendsPage.list).toHaveChildren(1);

		// Cleanup
		await AutosendsPage.stopAutosend(0);
	});
});
