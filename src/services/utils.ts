/* eslint-disable no-empty */

import { Autosend } from '../types/autosend';
import { MessageContent, StorageMessage } from '../types/message';

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

export const autosendToStorageMessage = (autosend: Autosend, tags?: string[]): StorageMessage => ({
	headers: autosend.headers,
	key: autosend.key,
	value: autosend.value,
	tags: tags ?? [],
});