import { writeFile } from 'fs/promises';
import { homedir } from 'os';

type Settings = {
	CONNECTIONS: {
		brokers: string[],
		name: string
	}[]
}

// Workaround on the `button.click()` bug on tauri and wdio
// https://github.com/tauri-apps/tauri/issues/6541
export async function click(button: WebdriverIO.Element, timeout?: number) {
	await button.waitForClickable({timeout});
	await browser.execute('arguments[0].click();', button);
}

// Workaround on the `button.setValue()` bug on tauri and wdio
// https://github.com/tauri-apps/tauri/issues/6541
export async function setValue (input: WebdriverIO.Element, value: number | string) {
	await browser.execute(`arguments[0].value="${value}"`, input);
	await browser.execute('arguments[0].dispatchEvent(new Event("input", { bubbles: true }))', input);
}

export async function sleep(time = 5000) {
	return new Promise(resolve => setTimeout(resolve, time));
}

export const e2eConnectionName = 'Localhost E2E'; 

/**
 * Creates a connection with given port
 * directly into the .kafka_panel/config/e2e/settings.json file
 * 
 * @param port
 */
export async function createTestConnection(port: number) {
	const settings: Settings = {
		CONNECTIONS: [{
			name: e2eConnectionName,
			brokers: [`localhost:${port}`],
		}]
	};

	await writeFile(`${homedir()}/.kafka_panel/config/e2e/settings.json`, JSON.stringify(settings));
}