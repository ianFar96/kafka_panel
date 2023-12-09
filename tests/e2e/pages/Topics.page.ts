import { click, setValue, waitForLoaderToHide } from '../utils.js';

class TopicsPage {
	get chooseConnectionTitle() { return $('aria/Choose Connection'); }
	get table() { return $('table'); }
	get tableBody() { return this.table.$('tbody'); }
	get searchInput() { return $('input[placeholder="Search"]'); }
	get refreshButton() { return $('button[title="Refresh list"'); }

	async selectConnection (connectionName: string) {
		const connection = await $(`li=${connectionName}`);
		await click(connection);

		await waitForLoaderToHide();
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

	async waitUntilTopicsCount(elementsCount: number) {
	}

	async search(searchString: string) {
		await setValue(await this.searchInput, searchString);
	}

	async refresh() {
		await click(await this.refreshButton);
		await waitForLoaderToHide();
	}

	async goToMessages(topicName: string) {
		const topicRow = await this.getRow(topicName);
		const messagesLink = await topicRow.$('a[title=Messages]');
		await click(messagesLink);
		await waitForLoaderToHide();
	}

	getRow(topicName: string) {
		return this.table.$(`td=${topicName}`).$('..');
	}

	getCell(row: WebdriverIO.Element, columName: 'state' | 'watermarks' | 'partitions') {
		switch (columName) {
		case 'state':
			return row.$('//td[1]/div/div[title="Consuming"|title="Disconnected"|title="Unconnected"]');
		case 'watermarks':
			return row.$('//td[2]');
		case 'partitions':
			return row.$('//td[3]');
		}
	}
}

export default new TopicsPage();