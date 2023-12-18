import { Message } from 'kafkajs';
import GroupsPage from '../pages/Groups.page.js';
import MessagesPage from '../pages/Messages.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName, getAdmin, getConsumer, getProducer } from '../utils.js';

describe('Topics', () => {
	it('should set a connection', async () => {
		await TopicsPage.selectConnection(e2eConnectionName);
		await expect(TopicsPage.table).toBeDisplayed();
	});

	it('should create and delete a topic', async () => {
		const topicName = 'topics.create.new.topic';
		await TopicsPage.createTopic(topicName, 5);
		await expect(await TopicsPage.tableBody).toHaveChildren(1);

		const topicRow = await TopicsPage.getRow(topicName);
		const topicPartitionsCell = await TopicsPage.getCell(topicRow, 'partitions');
		await expect(topicPartitionsCell).toHaveText('5');

		const topicWatermarkCell = await TopicsPage.getCell(topicRow, 'watermarks');
		await expect(topicWatermarkCell).toHaveText('0');

		await TopicsPage.deleteTopic(topicName);
		await expect(await TopicsPage.tableBody).toHaveChildren(0);
	});

	it('should show how the state changes', async () => {
		const topicName = 'topics.change.state';
		await TopicsPage.createTopic(topicName);

		const topicRow = await TopicsPage.getRow(topicName);
		const stateCell = await TopicsPage.getCell(topicRow, 'state');

		await expect(stateCell).toHaveAttribute('title', 'Unconnected');

		// Connect to the topic
		const groupId = 'topics.change.state';
		const consumer = await getConsumer(groupId);
		await consumer.subscribe({topic: topicName, fromBeginning: true});
		await consumer.run({eachBatch: async() => {/* do nothing */}});

		await TopicsPage.refresh();
		await expect(stateCell).toHaveAttribute('title', 'Consuming');

		// Disconnect from topic
		await consumer.stop();
		await consumer.disconnect();

		// Set the offset
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '1'}]});

		await TopicsPage.refresh();
		await expect(stateCell).toHaveAttribute('title', 'Disconnected');

		await TopicsPage.deleteTopic(topicName);
	});

	it('should calculate watermarks', async () => {
		const topicName = 'topics.calculate.watermark';
		await TopicsPage.createTopic(topicName, 2);

		const producer = await getProducer();
		await producer.send({
			topic: topicName,
			messages: [{
				value: 'value',
				partition: 0
			}]
		});
		await producer.send({
			topic: topicName,
			messages: [{
				value: 'value',
				partition: 1
			}]
		});

		await TopicsPage.refresh();

		const topicRow = await TopicsPage.getRow(topicName);
		const topicWatermarkCell = await TopicsPage.getCell(topicRow, 'watermarks');
		await expect(topicWatermarkCell).toHaveText('2');

		await TopicsPage.deleteTopic(topicName);
	});

	it('should search', async () => {
		const topicName1 = 'topics.search.1';
		const topicName2 = 'topics.search.2';

		await TopicsPage.createTopic(topicName1);
		await TopicsPage.createTopic(topicName2);
		await expect(await TopicsPage.tableBody).toHaveChildren(2);

		await TopicsPage.search(topicName1);

		await expect(await TopicsPage.tableBody).toHaveChildren(1);
		const topic1Row = await TopicsPage.getRow(topicName1);
		await expect(topic1Row).toBeDisplayed();

		// Empty search bar
		await TopicsPage.search('');

		// Delete created topics
		await TopicsPage.deleteTopic(topicName1);
		await TopicsPage.deleteTopic(topicName2);
	});
});

describe('Messages', () => {
	const topicName = 'messages.default';

	it('should send a message', async () => {
		await TopicsPage.createTopic(topicName);
		await TopicsPage.goToMessages(topicName);

		await MessagesPage.sendMessage();
		expect(await MessagesPage.list).toHaveChildren(1);
	});

	it('should send a message from an already sent message', async () => {
		await MessagesPage.sendMessage(0);
		expect(await MessagesPage.list).toHaveChildren(2);
	});

	it('should stop and restart the listener', async () => {
		await MessagesPage.stopListener();

		const producer = await getProducer();
		const message: Message = {
			key: JSON.stringify({some: 'key'}),
			value: JSON.stringify({some: 'value'})
		};
		await producer.send({topic: topicName, messages: [message]});

		// Wait a bit to make sure a message won't appear in the list
		await browser.pause(1000);
		expect(await MessagesPage.list).toHaveChildren(2);

		await MessagesPage.startListener();
		expect(await MessagesPage.list).toHaveChildren(3);
	});
});

describe('Groups', () => {
	// Use the same topic as the messages
	const topicName = 'messages.default';
	const groupId = 'groups.default';

	it('should see consumer group', async () => {
		const groupsLink = await $('a=Groups');
		await click(groupsLink);

		expect(await GroupsPage.tableBody).toHaveChildren(0);

		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '2'}]});

		await GroupsPage.refresh();
		expect(await GroupsPage.tableBody).toHaveChildren(1);

		const groupRow = await GroupsPage.getRow(groupId);
		const lowCell = await GroupsPage.getCell(groupRow, 'low');
		await expect(lowCell).toHaveText('2');

		const highCell = await GroupsPage.getCell(groupRow, 'high');
		await expect(highCell).toHaveText('3');

		const lagCell = await GroupsPage.getCell(groupRow, 'lag');
		await expect(lagCell).toHaveText('1');

		// Should not be disabled
		const seekLatestOffsetsButton = await GroupsPage.getAction(groupRow, 'seekEarliestOffsets');
		await expect(seekLatestOffsetsButton).not.toHaveElementClass('text-gray-500');
		const commitLatestOffsetsButton = await GroupsPage.getAction(groupRow, 'commitLatestOffsets');
		await expect(commitLatestOffsetsButton).not.toHaveElementClass('text-gray-500');
	});

	it('should commit latest offsets', async () => {
		await GroupsPage.commitLatestOffsets(groupId);

		const groupRow = await GroupsPage.getRow(groupId);
		const lowCell = await GroupsPage.getCell(groupRow, 'low');
		await expect(lowCell).toHaveText('3');

		const highCell = await GroupsPage.getCell(groupRow, 'high');
		await expect(highCell).toHaveText('3');

		const lagCell = await GroupsPage.getCell(groupRow, 'lag');
		await expect(lagCell).toHaveText('0');

		// Should be disabled
		const commitLatestOffsetsButton = await GroupsPage.getAction(groupRow, 'commitLatestOffsets');
		await expect(commitLatestOffsetsButton).toHaveElementClass('text-gray-500');

		// Should not be disabled
		const seekLatestOffsetsButton = await GroupsPage.getAction(groupRow, 'seekEarliestOffsets');
		await expect(seekLatestOffsetsButton).not.toHaveElementClass('text-gray-500');
	});

	it('should seek earliest offsets', async () => {
		await GroupsPage.seekEarliestOffsets(groupId);

		// The group should disappear
		expect(await GroupsPage.tableBody).toHaveChildren(0);
	});

	it('should delete new consumer group', async () => {
		const groupId = 'groups.delete';

		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '3'}]});

		await GroupsPage.refresh();
		expect(await GroupsPage.tableBody).toHaveChildren(1);

		await GroupsPage.deleteGroup(groupId);

		// The group should disappear
		expect(await GroupsPage.tableBody).toHaveChildren(0);
	});

	it('should show how the state changes', async () => {
		const groupId = 'groups.change.state';

		// Connect to the topic
		const consumer = await getConsumer(groupId);
		await consumer.subscribe({topic: topicName, fromBeginning: true});
		await consumer.run({eachBatch: async() => {/* do nothing */}});

		await GroupsPage.refresh();

		const groupRow = await GroupsPage.getRow(groupId);
		const stateCell = await GroupsPage.getCell(groupRow, 'state');

		await expect(stateCell).toHaveAttribute('title', 'Consuming');

		// Disconnect from topic
		await consumer.stop();
		await consumer.disconnect();

		// Set the offset
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '1'}]});

		await GroupsPage.refresh();
		await expect(stateCell).toHaveAttribute('title', 'Disconnected');

		await GroupsPage.deleteGroup(groupId);
	});

	it('should search', async () => {
		const groupName1 = 'groups.search.1';
		const groupName2 = 'groups.search.2';

		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId: groupName1, topic: topicName, partitions: [{partition: 0, offset: '3'}]});
		await admin.setOffsets({groupId: groupName2, topic: topicName, partitions: [{partition: 0, offset: '3'}]});

		await GroupsPage.refresh();
		expect(await GroupsPage.tableBody).toHaveChildren(2);

		await GroupsPage.search(groupName1);

		expect(await GroupsPage.tableBody).toHaveChildren(1);
		const group1Row = await GroupsPage.getRow(groupName1);
		await expect(group1Row).toBeDisplayed();

		// Empty search bar
		await GroupsPage.search('');

		// Delete created groups
		await GroupsPage.deleteGroup(groupName1);
		await GroupsPage.deleteGroup(groupName2);
	});
});
