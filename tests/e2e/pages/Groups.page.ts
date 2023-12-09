import { click, setValue, waitForLoaderToHide } from '../utils.js';

class GroupsPage {
	get table() { return $('table'); }
	get tableBody() { return this.table.$('tbody'); }
	get confirmButton() { return $('button=Accept'); }
	get searchInput() { return $('input[placeholder="Search"]'); }
	get refreshButton() { return $('button[title="Refresh list"'); }

	async refresh() {
		await click(await this.refreshButton);
		await waitForLoaderToHide();
	}

	getRow(groupName: string) {
		return this.table.$(`td=${groupName}`).$('..');
	}

	getCell(row: WebdriverIO.Element, columName: 'state' |'low' | 'high' | 'lag') {
		switch (columName) {
		case 'state':
			return row.$('//td[1]/div/div[title="Consuming"|title="Disconnected"|title="Unconnected"]');
		case 'low':
			return row.$('//td[2]');
		case 'high':
			return row.$('//td[3]');
		case 'lag':
			return row.$('//td[4]');
		}
	}

	getAction(row: WebdriverIO.Element, actionName: 'seekEarliestOffsets' | 'commitLatestOffsets') {
		switch (actionName) {
		case 'seekEarliestOffsets':
			return row.$('button[title="Seek earliest offsets"]');
		case 'commitLatestOffsets':
			return row.$('button[title="Commit latest offsets"]');
		}
	}

	async commitLatestOffsets(groupName: string) {
		const row = await this.getRow(groupName);
		const commitLatestOffsetsButton = await this.getAction(row, 'commitLatestOffsets');
		await click(commitLatestOffsetsButton);

		await click(await this.confirmButton);
		await waitForLoaderToHide();
	}

	async seekEarliestOffsets(groupName: string) {
		const row = await this.getRow(groupName);
		const seekEarliestOffsetsButton = await this.getAction(row, 'seekEarliestOffsets');
		await click(seekEarliestOffsetsButton);

		await click(await this.confirmButton);
		await waitForLoaderToHide();
	}

	async deleteGroup(groupName: string) {
		const row = await this.getRow(groupName);
		const seekEarliestOffsetsButton = await this.getAction(row, 'seekEarliestOffsets');
		await click(seekEarliestOffsetsButton);

		await click(await this.confirmButton);
		await waitForLoaderToHide();
	}

	async search(searchString: string) {
		await setValue(await this.searchInput, searchString);
	}
}

export default new GroupsPage();