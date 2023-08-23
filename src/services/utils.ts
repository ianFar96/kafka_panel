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
	let key = message.key;
	try {
		if (typeof message.key === 'string') {
			key = JSON.parse(message.key);
		}
	} catch (error) { }

	let value = message.value;
	try {
		if (typeof message.value === 'string') {
			value = JSON.parse(message.value);
		}
	} catch (error) { }
  
	return {
		headers: message.headers && Object.entries(message.headers).reduce((acc, [key, value]) => {
			try {
				if (typeof value === 'string') {
					value = JSON.parse(value);
				}
			} catch (error) { }

			return {
				...acc,
				[key]: value
			};
		}, {}),
		key,
		value,
	};
};
