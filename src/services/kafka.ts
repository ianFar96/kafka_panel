import { invoke } from '@tauri-apps/api';
import { SaslConfig } from '../types/connection';
import { ConsumerGroup, ConsumerGroupState } from '../types/consumerGroup';
import { KafkaMessage } from '../types/message';
import { Topic } from '../types/topic';
import { UnlistenFn, emit, listen } from '@tauri-apps/api/event';
import { message } from '@tauri-apps/api/dialog';
import { Subject } from 'rxjs';

class KafkaService {
	private unlisten?: UnlistenFn;
	
	async setConnection(brokers: string[], groupId: string, sasl?: SaslConfig) {
		await invoke('set_connection_command', {brokers, groupId, sasl});
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

	async listenMessages(topic: string, messagesNumber: number) {
		if (this.unlisten) {
			throw new Error('Unexpected error: previous listening for messages is still active');
		}

		const messagesSubject = new Subject<KafkaMessage>();
		invoke('listen_messages_command', {topic, messagesNumber})
			.then(() => {
				messagesSubject.complete();
				
				this.unlisten?.();
				delete this.unlisten;
			})
			.catch(async error => {
				messagesSubject.error(error);
			});

		const unlisten = await listen<KafkaMessage>('onMessage', (event) => {
			const kafkaMessage = event.payload;
			messagesSubject.next(kafkaMessage);
		});

		this.unlisten = unlisten;

		return messagesSubject.asObservable();
	}

	async offMessage() {
		await emit('offMessage');
	}

	async sendMessage(topic: string, key: string, value: string) {
		await invoke('send_message_command', {topic, key, value});
	}
}

const kafkaService = new KafkaService();

export default kafkaService;