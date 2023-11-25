import { invoke } from '@tauri-apps/api';
import { message as alert } from '@tauri-apps/api/dialog';
import { AutosendsService } from './autosends';
import { KafkaService } from './kafka';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type Extras = {
	kafkaService?: KafkaService
	autosendsService?: AutosendsService
}

class Logger {
	constructor(private level: LogLevel) {}

	async trace(message: unknown, extras?: Extras) {
		if (this.level === 'trace') {
			const extrasObject = this.getExtrasObject(extras);
			console.log(`[${new Date().toString()}] TRACE: ${message}`, {extras: extrasObject});
			await invoke('append_log_command', {message, level: 'trace', extras: extrasObject});
		}
	}

	async debug(message: unknown, extras?: Extras) {
		if (this.level === 'trace' || this.level === 'debug') {
			const extrasObject = this.getExtrasObject(extras);
			console.log(`[${new Date().toString()}] DEBUG: ${message}`, {extras: extrasObject});
			await invoke('append_log_command', {message, level: 'debug', extras: extrasObject});
		}
	}

	async info(message: unknown, extras?: Extras) {
		if (this.level === 'trace' || this.level === 'debug' || this.level === 'info') {
			const extrasObject = this.getExtrasObject(extras);
			console.log(`[${new Date().toString()}] INFO: ${message}`, {extras: extrasObject});
			await invoke('append_log_command', {message, level: 'info', extras: extrasObject});
		}
	}

	async warn(message: unknown, extras?: Extras) {
		if (this.level === 'trace' || this.level === 'debug' || this.level === 'info' || this.level === 'warn') {
			const extrasObject = this.getExtrasObject(extras);
			console.log(`⚠️ [${new Date().toString()}] WARN: ${message}`, {extras: extrasObject});
			await invoke('append_log_command', {message, level: 'warn', extras: extrasObject});
		}
	}

	async error(message: unknown, extras?: Extras) {
		await alert(message as string, { title: 'Error', type: 'error' });

		if (this.level !== 'silent') {
			const extrasObject = this.getExtrasObject(extras);
			console.log(`❌ [${new Date().toString()}] ERROR: ${message}`, {extras: extrasObject});
			await invoke('append_log_command', {message, level: 'error', extras: extrasObject});
		}
	}

	private getExtrasObject(extras?: Extras) {
		return {
			...(extras?.kafkaService?.id ? {
				kafka_service_id: extras?.kafkaService?.id
			} : {}),
			...(extras?.autosendsService?.kafkaService.id ? {
				kafka_service_id: extras?.autosendsService?.kafkaService
			} : {})
		};
	}
}

const isDev = await invoke('is_dev');
const logger = new Logger(isDev ? 'trace' : 'info');

export default logger;