import { invoke } from '@tauri-apps/api';
import { message as alert } from '@tauri-apps/api/dialog';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

class Logger {
	constructor(private level: LogLevel) {}

	async trace(message: unknown) {
		if (this.level === 'trace') {
			console.log(`[${new Date().toString()}] TRACE: ${message}`);
			await invoke('append_log', {message, level: 'trace'});
		}
	}

	async debug(message: unknown) {
		if (this.level === 'trace' || this.level === 'debug') {
			console.log(`[${new Date().toString()}] DEBUG: ${message}`);
			await invoke('append_log', {message, level: 'debug'});
		}
	}

	async info(message: unknown) {
		if (this.level === 'trace' || this.level === 'debug' || this.level === 'info') {
			console.log(`[${new Date().toString()}] INFO: ${message}`);
			await invoke('append_log', {message, level: 'info'});
		}
	}

	async warn(message: unknown) {
		if (this.level === 'trace' || this.level === 'debug' || this.level === 'info' || this.level === 'warn') {
			console.log(`⚠️ [${new Date().toString()}] WARN: ${message}`);
			await invoke('append_log', {message, level: 'warn'});
		}
	}

	async error(message: unknown) {
		await alert(message as string, { title: 'Error', type: 'error' });

		if (this.level !== 'silent') {
			console.log(`❌ [${new Date().toString()}] ERROR: ${message}`);
			await invoke('append_log', {message, level: 'error'});
		}
	}
}

const isDev = await invoke('is_dev');
const logger = new Logger(isDev ? 'trace' : 'info');

export default logger;