import router from './router';
import { Setting, SettingKey } from '../types/settings';
import storageService from './storage';
import logger from './logger';

type Page = 'topics' | 'groups' | 'messages' | 'messages-storage' | 'autosend'

// TODO: add alert on error logs
async function checkSettings(page: Page) {
	// Settings must be seeded for this to work
	const settingsDependencies: { [key: string]: SettingKey[] } = {
		topics: ['CONNECTIONS'],
		groups: ['CONNECTIONS'],
		messages: ['MESSAGES'],
		'messages-storage': ['CONNECTIONS'],
		autosend: ['CONNECTIONS'],
	};

	const dependencies = settingsDependencies[page];

	if (!dependencies) {
		logger.error(`Unknown page in check settings: ${page}`);
	} else {
		const settings = (await Promise.all(dependencies.map(async (dependency) =>
			await storageService.settings.get(dependency)
		))).filter(Boolean) as Setting[];

		const missingSettings = settings.filter(setting => setting.value === '');
		if (missingSettings.length > 0) {
			logger.error(`Please fill the following settings to make this page work: ${missingSettings.map(setting => setting.label).join(', ')}`);
			await router.push('/settings');
		}
	}
}


export default checkSettings;
