import { click, setValue } from '../utils.js';

class TopicsPage {
	get chooseConnectionTitle () { return $('aria/Choose Connection'); }
	get topicsTable () { return $('table'); }

	async selectConnection (connectionName: string) {
		const connection = await $(`li=${connectionName}`);
		await click(connection);
	}

	async getTitle (connectionName: string) { 
		return $(`aria/${connectionName} topics`); 
	}

	async createTopic(topicName: string, partitions: number) {
		const newTopicButton = await $('button=New topic');
		await click(newTopicButton);

		const title = $('aria/Create topic');
		await expect(title).toBeDisplayed();

		const nameInput = await $('input[name="name"]');
		await setValue(nameInput, topicName);

		const partitionsInput = await $('input[name="partitions"]');
		await setValue(partitionsInput, partitions);

		const createButton = await $('button=Create');
		await click(createButton);
	}

	async deleteTopic(topicName: string) {
		const topicRow = await this.getRow(topicName);
		const deleteButton = await topicRow.$('button[title="Delete topic"]');
		await click(deleteButton);
	}

	getRow(topicName: string) {
		return this.topicsTable.$(`td=${topicName}`).$('..');
	}

	getCell(row: WebdriverIO.Element, columName: 'name' | 'partitions') {
		switch (columName) {
		case 'name':
			return row.$('td[0]');
		case 'partitions':
			return row.$('td[2]');
		}
	}
}

export default new TopicsPage();