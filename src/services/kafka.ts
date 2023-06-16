import { invoke } from '@tauri-apps/api';
import { SaslConfig } from '../types/connection';
import { ConsumerGroup, ConsumerGroupState } from '../types/consumerGroup';
import { KafkaMessage } from '../types/message';
import { Topic } from '../types/topic';

export class KafkaManager {
	async setConnection(brokers: string[], sasl?: SaslConfig, groupIdPrefix = '') {
		await invoke('set_connection_command', {brokers, sasl, groupId: `${groupIdPrefix ? `${groupIdPrefix}.` : ''}kafka-panel`});
	}

	async getTopicsState() {
		const topicsGroups: Record<string, ConsumerGroupState> = await invoke('get_topics_state_command');
		return topicsGroups;
	}

	async listGroupsFromTopic(topicName: string) {
		const groups: ConsumerGroup[] = await invoke('get_groups_from_topic_command', {topicName});
		return groups;
	}

	async resetOffsets(groupName: string, topicName: string) {
		await invoke('reset_offsets_command', {groupName, topicName});
	}

	async listTopics() {
		const topics: Topic[] = await invoke('get_topics_command');
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

	async getMessages(topic: string, messagesNumber: number) {
		const messages: KafkaMessage[] = await invoke('get_messages_command', {topic, messagesNumber});
		return messages;
	}

	async sendMessage(topic: string, key: string, value: string) {
		await invoke('send_message_command', {topic, key, value});
	}
}