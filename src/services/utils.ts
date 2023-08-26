/* eslint-disable no-empty */

export const tryJsonParse = (text: unknown): unknown => {
	try {
		if (typeof text === 'string') {
			return JSON.parse(text);
		}
	} catch (error) { }

	return text;
};
