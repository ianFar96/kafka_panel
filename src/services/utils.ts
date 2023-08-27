/* eslint-disable no-empty */

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
