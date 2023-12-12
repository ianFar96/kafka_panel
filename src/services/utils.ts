/* eslint-disable no-empty */

import * as monaco from 'monaco-editor';
import { Autosend, AutosendOptions } from '../types/autosend';
import { MessageContent, Headers, StorageMessage } from '../types/message';

export const isKeyValid = (key: string | null) => {
	return key !== null && key !== '';
};

export const tryJsonParse = (text: unknown): unknown => {
	try {
		// Do not parse string "null" to differentiate it from empty buffer
		if (typeof text === 'string' && text !== 'null') {
			return JSON.parse(text);
		}
	} catch (error) { }
	return text;
};

export const displayMessage = (message: MessageContent) => {
	return JSON.stringify({
		headers: displayHeaders(message.headers),
		key: tryJsonParse(message.key),
		value: tryJsonParse(message.value)
	}, null, 2);
};

export const displayHeaders = (headers: Headers) => {
	if (headers === null) {
		return null;
	}
	return Object.entries(headers).reduce((acc, [key, value]) => ({
		...acc,
		[key]: tryJsonParse(value)
	}), {});
};

export const autosendToStorageMessage = (autosend: Autosend, tags?: string[]): StorageMessage => ({
	headers: autosend.headers,
	key: autosend.key,
	value: autosend.value,
	tags: tags ?? [],
});

export const getDefaultMessage = (): MessageContent => ({
	headers: null,
	key: JSON.stringify({
		id: '{{faker.string.uuid()}}'
	}, null, 2),
	value: JSON.stringify({
		id: '{{key.id}}',
		name: '{{faker.person.fullName()}}'
	}, null, 2)
});

export const isValidHeaders = (headers: Headers) => {
	return headers === null || Object.keys(headers).every(isKeyValid);
};

export const getDefaultAutosendConfiguration = (): AutosendOptions => ({
	duration:{
		time_unit: 'Minutes',
		value: 10
	},
	interval:{
		time_unit: 'Seconds',
		value: 1
	}
});

export const getMonacoEditorCompletionItems = (
	suggestions: object,
	range: monaco.IRange
): monaco.languages.CompletionItem[] => {
	// This is used to ignore circular dependencies when looping throught the suggestions object
	const ancestors: unknown[] = [];

	const accumulator: monaco.languages.CompletionItem[] = [];
	const recursion = (suggestions: object, previousKey?: string) =>  {
		for (const [key, value] of Object.entries(suggestions ?? {})) {
			// Avoid circular dependencies
			if (typeof value === 'object' && value !== null) {
				if (ancestors.includes(value)) {
					continue;
				}
				ancestors.push(value);
			}

			const newKey = previousKey ? `${previousKey}.${key}` : key;
			if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
				recursion(value, newKey);
			} else {
				let suggestionKind: monaco.languages.CompletionItemKind;
				let insertText = '';
				switch (typeof value) {
				case 'function':
					suggestionKind = monaco.languages.CompletionItemKind.Function;
					insertText = `${newKey}()`;
					break;

				default:
					suggestionKind = monaco.languages.CompletionItemKind.Field;
					insertText = newKey;
					break;
				}
				accumulator.push({
					label: newKey,
					kind: suggestionKind,
					documentation: value.toString(),
					insertText,
					range,
				});
			}
		}
	};
	recursion(suggestions);

	return accumulator;
};
