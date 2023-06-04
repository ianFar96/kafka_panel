import db from './database';
import router from './router';
import { Setting, SettingKey } from '../types/settings';
import { message } from '@tauri-apps/api/dialog';

type Page = 'topics'

async function checkSettings(page: Page) {
	// Settings must be seeded for this to work
	const settingsDependencies: { [key: string]: SettingKey[] } = {
		topics: ['CONNECTIONS']
	};

	const dependencies = settingsDependencies[page];

	if (!dependencies) {
		await message('Unknown page in check settings', { title: 'Error', type: 'error' });
	} else {
		const settings = (await db.settings.bulkGet(dependencies)).filter(Boolean) as Setting[];

		const missingSettings = settings.filter(setting => setting.value === '');
		if (missingSettings.length > 0) {
			await message(`Please fill the following settings to make this page work: ${missingSettings.map(setting => setting.label).join(', ')}`, { title: 'Error', type: 'error' });
			await router.push('/settings');
		}
	}
}


export default checkSettings;
