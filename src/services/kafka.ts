import { invoke } from '@tauri-apps/api';
import { SaslConfig } from '../types/connection';
import { ConsumerGroup, ConsumerGroupState } from '../types/consumerGroup';
import { Message, MessageContent, ParsedHeaders } from '../types/message';
import { Topic } from '../types/topic';
import { UnlistenFn, emit, listen } from '@tauri-apps/api/event';
import { Subject } from 'rxjs';
import { messageToSendMessage } from './utils';

class KafkaService {
	private unlisten?: UnlistenFn;
	private batchingInterval?: NodeJS.Timer;
	private batchMessages: Message[] = [];
	
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
		const messageToSend = messageToSendMessage(message);
		await invoke('send_message_command', {
			topic, 
			headers: messageToSend.headers, 
			key: messageToSend.key,
			value: messageToSend.value
		});
	}
}

const kafkaService = new KafkaService();

export default kafkaService;