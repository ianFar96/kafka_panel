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