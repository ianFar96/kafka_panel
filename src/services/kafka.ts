import { faker } from '@faker-js/faker';
import { invoke } from '@tauri-apps/api';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { clone } from 'ramda';
import { Subject } from 'rxjs';
import { SaslConfig } from '../types/connection';
import { ConsumerGroup, ConsumerGroupState } from '../types/consumerGroup';
import { Message, MessageContent } from '../types/message';
import { Topic } from '../types/topic';
import { v4 as uuidv4 } from 'uuid';

export class KafkaService {
	public readonly id = uuidv4();

	async setConnection(brokers: string[], groupId: string, sasl?: SaslConfig) {
		await invoke('set_connection_command', {brokers, groupId, sasl});
	}

	async getTopicsState() {
		const topicsGroups = await invoke<Record<string, ConsumerGroupState>>('get_topics_state_command');
		return topicsGroups;
	}

	async getTopicsWatermark() {
		const watermarksSubject = new Subject<{topic: string, watermark: number}>();

		let unlisten: UnlistenFn | undefined = await listen<{topic: string, watermark: number}>(`onWatermark-${this.id}`, (event) => {
			watermarksSubject.next(event.payload);
		});

		invoke('get_topics_watermark_command', {id: this.id})
			.then(() => {
				watermarksSubject.complete();
			})
			.catch(async error => {
				watermarksSubject.error(error);
			})
			.finally(() => {
				unlisten?.();
				unlisten = undefined;
			});

		return watermarksSubject.asObservable();
	}

	async offWatermark() {
		await emit(`offWatermark-${this.id}`);
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
		const messagesSubject = new Subject<Message>();

		let unlisten: UnlistenFn | undefined = await listen<Message>(`onMessage-${this.id}`, (event) => {
			messagesSubject.next(event.payload);
		});

		invoke('listen_messages_command', {topic, messagesNumber, id: this.id})
			.then(() => {
				messagesSubject.complete();
			})
			.catch(async error => {
				messagesSubject.error(error);
			})
			.finally(() => {
				unlisten?.();
				unlisten = undefined;
			});

		return messagesSubject.asObservable();
	}

	async offMessage() {
		await emit(`offMessage-${this.id}`);
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
