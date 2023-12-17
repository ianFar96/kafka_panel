import { setValue } from '../utils.js';

class SettingsPage {
	get pageLink() { return $('aside a[href="#/settings"]'); }

	async updateNumberOfMessages(value: number) {
		const numberOfMessagesInput = await $('label=Number of messages').$('../input[@type="number"]');
		await setValue(numberOfMessagesInput, value);
	}
}

export default new SettingsPage();