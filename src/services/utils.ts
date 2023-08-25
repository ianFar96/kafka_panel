/* eslint-disable no-empty */
import { MessageContent, SendMessage } from '../types/message';

export const messageToSendMessage = (message: MessageContent): SendMessage => {
	return {
		headers: message.headers && Object.entries(message.headers).reduce((acc, [key, value]) => ({
			...acc,
			[key]: JSON.stringify(value, null, 2)
		}), {}),
		key: JSON.stringify(message.key, null, 2),
		value: JSON.stringify(message.value, null, 2),
	};
};

export const sendMessageToMessage = (message: SendMessage): MessageContent => {
	return {
		headers: message.headers && Object.entries(message.headers).reduce((acc, [key, value]) => {
			return {
				...acc,
				[key]: tryJsonParse(value)
			};
		}, {}),
		key: tryJsonParse(message.key),
		value: tryJsonParse(message.value),
	};
};

export const tryJsonParse = (text: unknown): unknown => {
	try {
		if (typeof text === 'string') {
			return JSON.parse(text);
		}
	} catch (error) { }

	return text;
};
