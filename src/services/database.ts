import Dexie, { Table } from 'dexie';
import { Setting } from '../types/settings';
import { StorageMessage } from '../types/message';

class Databse extends Dexie {
	settings!: Table<Setting>;
	messages!: Table<StorageMessage>;

	constructor() {
		super('kafkaPanelDB');
		this.version(2).stores({
			settings: '++key',
			messages: '++id'
		});
	}
}


const db = new Databse();

// Seed
const settings: Setting[] = [
	{
		key: 'CONNECTIONS',
		value: JSON.stringify([{
			name: 'Localhost',
			brokers: [
				'localhost:9092'
			]
		}], null, 2),
		label: 'Connections',
		description: 'Check out the example here https://github.com/ianFar96/kafka_panel#settings',
		type: 'json'
	},
	{
		key: 'MESSAGES',
		value: '20',
		label: 'Messages',
		description: 'Number of messages to display for each partition when subscribing to a topic. Ex. the last 20 messages',
		type: 'text'
	}
];

const existingSettings = (await db.settings.toArray()).filter(Boolean) as Setting[];
const existingSettingsMap: { [key: string]: Setting } = existingSettings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting }), {});

await db.settings.clear();
settings.forEach(setting => {
	if (existingSettingsMap[setting.key]) {
		setting.value = existingSettingsMap[setting.key].value;
	}
	db.settings.add(setting);
});

await db.open();

export default db;