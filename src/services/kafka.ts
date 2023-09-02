import { faker } from '@faker-js/faker';
import { clone } from 'ramda';
import { invoke } from '@tauri-apps/api';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { Subject } from 'rxjs';
import { SaslConfig } from '../types/connection';
import { ConsumerGroup, ConsumerGroupState } from '../types/consumerGroup';
import { Message, MessageContent } from '../types/message';
import { Topic } from '../types/topic';

class KafkaService {
	private unlisten?: UnlistenFn;
	private batchingInterval?: NodeJS.Timer;
	private batchMessages: Message[] = [];
	
	async setConnection(brokers: string[], groupId: string, sasl?: SaslConfig) {
		await invoke('set_connection_command', {brokers, groupId, sasl});
	}

	async getTopicsState() {
		const topicsGroups = await invoke<Record<string, ConsumerGroupState>>('get_topics_state_command');
		return topicsGroups;
	}

	async listGroupsFromTopic(topicName: string) {
		const groups = await invoke<ConsumerGroup[]>('get_groups_from_topic_command', {topicName});
		return groups;
	}

	async resetOffsets(groupName: string, topicName: string) {
		await invoke('reset_offsets_command', {groupName, topicName});
	}

	async listTopics() {
		const topics = await invoke<Topic[]>('get_topics_command');
		return topics;
	}

	async createTopic(name: string, partitions?: number, replicationFactor?: number) {
		await invoke('create_topic_command', {
			topicName: name,
			numPartitions: partitions,
			replicationFactor
		});
	}

	async deleteTopic(name: string) {
		await invoke('delete_topic_command', {
			topicName: name,
		});	
	}

	async listenMessages(topic: string, messagesNumber: number) {
		const messagesSubject = new Subject<Message[]>();

		if (this.unlisten) {
			messagesSubject.error('Unexpected error: previous listening for messages is still active');
		}

		invoke('listen_messages_command', {topic, messagesNumber})
			.then(() => {
				messagesSubject.complete();

				clearInterval(this.batchingInterval);

				this.unlisten?.();
				delete this.unlisten;
			})
			.catch(async error => {
				messagesSubject.error(error);
			});

		const unlisten = await listen<Message>('onMessage', (event) => {
			const kafkaMessage = event.payload;
			this.batchMessages.push(kafkaMessage);
		});

		// Debounce batching system so in case of flow spike
		// VueJS has the time to display elements
		this.batchingInterval = setInterval(() => {
			if (this.batchMessages.length > 0) {
				messagesSubject.next(this.batchMessages);
				this.batchMessages = [];
			}
		}, 1000);

		this.unlisten = unlisten;

		return messagesSubject.asObservable();
	}

	async offMessage() {
		await emit('offMessage');
	}

	async sendMessage(topic: string, message: MessageContent) {
		const interpolatedHeaders = this.interpolateFakeValues(clone(message.headers), {faker});
		const interpolatedKey = this.interpolateFakeValues(clone(message.key), {faker});
		const interpolatedValue = this.interpolateFakeValues(clone(message.value), {faker, key: interpolatedKey});
		
		await invoke('send_message_command', {
			topic, 
			headers: interpolatedHeaders,
			key: interpolatedKey,
			value: interpolatedValue,
		});
	}

	private interpolateFakeValues<T = unknown>(input: T, context: Record<string, unknown>): T {
		if (typeof input === 'object') {
			if (Array.isArray(input)) {
				for (const key in input) {
					input[key] = this.interpolateFakeValues(input[key], context);
				}
			} else if (input !== null) {
				for (const key of Object.keys(input)) {
					const obj = input as Record<string, unknown>;
					obj[key] = this.interpolateFakeValues(obj[key], context);
				}
			}
		} else if (typeof input === 'string') {
			(input as string) = input.replace(/\{\{(.*?)\}\}/gm, (_, group) => {
				try {
					return this.scopeEval(context, `this.${group}`).toString();
				} catch (error) {
					throw new Error(`Interpolation error with "${group}"\n${error}`);
				}
			});
		}

		return input;
	}

	private scopeEval(scope: unknown, script: string) {
		return Function('"use strict";return (' + script + ')').bind(scope)();
	}
}

const kafkaService = new KafkaService();

export default kafkaService;