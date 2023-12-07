import { click, setValue, waitForLoaderToHide } from '../utils.js';

class TopicsPage {
	get chooseConnectionTitle () { return $('aria/Choose Connection'); }
	get table () { return $('table'); }

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

	getRow(topicName: string) {
		return this.table.$(`td=${topicName}`).$('..');
	}

	getCell(row: WebdriverIO.Element, columName: 'partitions') {
		switch (columName) {
		case 'partitions':
			return row.$('//td[3]');
		}
	}
}

export default new TopicsPage();