import { mkdir, rm, writeFile } from 'fs/promises';
import { Kafka, logLevel } from 'kafkajs';
import { after } from 'mocha';
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
const e2eSettingsFolderPath = `${homedir()}/.kafka_panel/e2e/config`;

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

	await mkdir(e2eSettingsFolderPath, {recursive: true});
	await writeFile(`${e2eSettingsFolderPath}/settings.json`, JSON.stringify(settings));
}

/**
 * Removes the E2E settings folder
 */
export async function deleteSettings() {
	await rm(e2eSettingsFolderPath, { recursive: true, force: true });
}

export async function waitForLoaderToHide() {
	const loader = await $('#loader');
	await loader.waitForDisplayed({
		reverse: true,
		timeout: 5000,
		timeoutMsg: 'expected loader to be hidden after 5s'
	});
}

let kafka: Kafka;
function setKafka() {
	if (!kafka) {
		kafka = new Kafka({ 
			brokers: [`localhost:${(global as any).kafkaContainer.getMappedPort(9093)}`],
			logLevel: logLevel.NOTHING
		});
	}
}

export async function getProducer() {
	setKafka();
	const producer = kafka.producer();
	await producer.connect();
	after(async () => {
		await producer.disconnect();
	});

	return producer;
}

export async function getConsumer(groupId: string) {
	setKafka();
	const consumer = kafka.consumer({ groupId });
	await consumer.connect();
	after(async () => {
		await consumer.disconnect();
	});

	return consumer;
}

export async function getAdmin() {
	setKafka();
	const admin = kafka.admin();
	await admin.connect();
	after(async () => {
		await admin.disconnect();
	});

	return admin;
}
