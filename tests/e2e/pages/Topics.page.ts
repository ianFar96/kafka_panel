import { ConsumerGroupState } from '../../../src/types/consumerGroup.js';
import { click, setValue, waitForLoaderToHide } from '../utils.js';

class TopicsPage {
	get chooseConnectionTitle() { return $('aria/Choose Connection'); }
	get table() { return $('table'); }
	get searchInput() { return $('input[placeholder="Search"]'); }
	get refreshButton() { return $('button[title="Refresh list"'); }

	async selectConnection (connectionName: string) {
		const connection = await $(`li=${connectionName}`);
		await click(connection);

		await waitForLoaderToHide();
	}

	async getTitle (connectionName: string) { 
		return $(`aria/${connectionName} topics`); 
	}

	async createTopic(topicName: string, partitions?: number) {
		const newTopicButton = await $('button=New topic');
		await click(newTopicButton);

		const title = $('aria/Create topic');
		await expect(title).toBeDisplayed();

		const nameInput = await $('input[name="name"]');
		await setValue(nameInput, topicName);

		if (partitions) {
			const partitionsInput = await $('input[name="partitions"]');
			await setValue(partitionsInput, partitions);
		}

		const createButton = await $('button=Create');
		await click(createButton);

		await waitForLoaderToHide();
	}

	async deleteTopic(topicName: string) {
		const topicRow = await this.getRow(topicName);
		const deleteButton = await topicRow.$('button[title="Delete topic"]');
		await click(deleteButton);

		const acceptButton = await $('button=Accept');
		await click(acceptButton);

		await waitForLoaderToHide();
	}

	async waitUntilGroupsCount(elementsCount: number) {
		await browser.waitUntil(async () => {
			const tableItems = await this.table.$$('tbody tr');
			return tableItems.length === elementsCount;
		}, {timeout: 5000, timeoutMsg: `expected list to have exactly ${elementsCount} groups after 5s`});
	}
	
	async search(searchString: string) {
		await setValue(await this.searchInput, searchString);
	}

	async refresh() {
		await click(await this.refreshButton);
		await waitForLoaderToHide();
	}

	getRow(topicName: string) {
		return this.table.$(`td=${topicName}`).$('..');
	}

	getCell(row: WebdriverIO.Element, columName: 'partitions') {
		switch (columName) {
		case 'partitions':
			return row.$('//td[3]');
		}
	}

	async waitForStateToBe(state: ConsumerGroupState, row: WebdriverIO.Element) {
		const stateElement = await row.$(`div[title=${state}]`);
		await expect(stateElement).toBeDisplayed();
	}
}

export default new TopicsPage();