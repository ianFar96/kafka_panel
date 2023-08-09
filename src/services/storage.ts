import { invoke } from '@tauri-apps/api';
import { SettingKey } from '../types/settings';
import { StorageMessage } from '../types/message';

class Store<T = unknown, K = string> {
	constructor(
    private storeName: string
	){}

	get(key: K): Promise<T> {
		return invoke('get_from_store_command', {storeName: this.storeName, key});
	}

	getAll(): Promise<Record<string, T>> {
		return invoke('get_all_from_store_command', {storeName: this.storeName});
	}

	save(value: T, key?: K): Promise<string> {
		return invoke('save_in_store_command', {storeName: this.storeName, value, key});
	}

	delete(key: K): Promise<void> {
		return invoke('delete_from_store_command', {storeName: this.storeName, key});
	}
}

const storageService = {
	settings: new Store<unknown, SettingKey>('settings'),
	messages: new Store<Omit<StorageMessage, 'id'>>('messages')
};

export default storageService;