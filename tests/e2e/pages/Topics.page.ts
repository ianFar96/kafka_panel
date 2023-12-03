import { click, setValue } from '../utils.js';

class TopicsPage {
	get chooseConnectionTitle () { return $('aria/Choose Connection'); }

	async selectConnection (connectionName: string) {
		const connection = await $(`li=${connectionName}`);
		await click(connection);
	}

	async getTitle (connectionName: string) { 
		return $(`aria/${connectionName} topics`); 
	}

	async createTopic(topicName: string) {
		const newTopicButton = await $('button=New topic');
		await click(newTopicButton);

		const title = $('aria/Create topic');
		await expect(title).toBeDisplayed();

		const nameInput = await $('input[name="name"]');
		await setValue(nameInput, topicName);

		const createButton = await $('button=Create');
		await click(createButton);
	}
}

export default new TopicsPage();