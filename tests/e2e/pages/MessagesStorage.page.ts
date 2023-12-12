class MessagesStoragePage {
	get list() { return $('ul'); }

	getTagsList(index: number) {
		return this.list.$(`//li[${index + 1}]/div/div/ul`);
	}
}

export default new MessagesStoragePage();