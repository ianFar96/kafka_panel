import { expect } from '@wdio/globals';

describe('My Login application', () => {
	it('should login with valid credentials', async () => {
		const title = $('#page-content h2');
		await expect(title).toHaveText('Choose Connection');
	});
});
