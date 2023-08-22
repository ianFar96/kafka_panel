import { expect } from '@wdio/globals';

// FIXME: cannot import from other files

describe('Topics', () => {
	it('should see topics list', async () => {
		const title = await $('#page-content h2');
		expect(await title.getText()).toBe('Choose Connection');

		// FIXME: UnsupportedOperationError
		const connection = await $('li=Localhost');
		await connection.click();

		const loader = await $('#loader');
		expect(loader).toBeDisplayed();
	});
});
