/* eslint-disable no-empty */

import { MessageContent } from '../types/message';

export const tryJsonParse = (text: unknown): unknown => {
	try {
		if (typeof text === 'string') {
			return JSON.parse(text);
		}
	} catch (error) { }

	return text;
};

export const isSendValid = ( value: unknown) => {
	if (value === undefined) {
		return false;
	}

	if (value === '') {
		return false;
	}

	return true;
};

export const stringifyMessage = (message: MessageContent) => {
	return JSON.stringify({
		headers: message.headers, 
		key: message.key,
		value: message.value
	}, null, 2);
};