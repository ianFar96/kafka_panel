import { Message } from 'kafkajs';
import GroupsPage from '../pages/Groups.page.js';
import MessagesPage from '../pages/Messages.page.js';
import TopicsPage from '../pages/Topics.page.js';
import { click, e2eConnectionName, getProducer, getAdmin, sleep, getConsumer } from '../utils.js';

const topicName = 'topic.e2e.test';
const groupId = 'topic.e2e.test.groupId';

describe('Topics', () => {
	it('should see topics list', async () => {
		await expect(TopicsPage.chooseConnectionTitle).toBeDisplayed();
		await TopicsPage.selectConnection(e2eConnectionName);

		await expect(TopicsPage.getTitle(e2eConnectionName)).toBeDisplayed();
	});

	it('should create a new topic', async () => {
		const topicPartitions = 5;
		await TopicsPage.createTopic(topicName, topicPartitions);

		const topicRow = await TopicsPage.getRow(topicName);
		const topicPartitionsCell = await TopicsPage.getCell(topicRow, 'partitions');
		await expect(topicPartitionsCell).toHaveText(topicPartitions.toString());
	});

	it('should delete the topic', async () => {
		await TopicsPage.deleteTopic(topicName);

		const topicsTableRows = await TopicsPage.table.$$('tbody tr');
		await expect(topicsTableRows).toHaveLength(0);
	});

	it('should change state', async () => {
		const changeStateTopic = 'topic.e2e.test.change.state';
		await TopicsPage.createTopic(changeStateTopic);

		const topicRow = await TopicsPage.getRow(changeStateTopic);
		await TopicsPage.waitForStateToBe('Unconnected', topicRow);

		// Connect to the topic
		const consumer = await getConsumer(groupId);
		await consumer.subscribe({topic: changeStateTopic, fromBeginning: true});
		await consumer.run({eachBatch: async() => {/* do nothing */}});

		await TopicsPage.refresh();
		await TopicsPage.waitForStateToBe('Consuming', topicRow);

		// Disconnect from topic
		await consumer.stop();
		await consumer.disconnect();

		// Set the offset
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: changeStateTopic, partitions: [{partition: 0, offset: '1'}]});

		await TopicsPage.refresh();
		await TopicsPage.waitForStateToBe('Disconnected', topicRow);

		await TopicsPage.deleteTopic(changeStateTopic);
	});

	it('should search', async () => {
		const topic1 = 'topic1';
		const topic2 = 'topic2';

		await TopicsPage.createTopic(topic1);
		await TopicsPage.createTopic(topic2);
		await TopicsPage.waitUntilGroupsCount(2);

		await TopicsPage.search(topic1);

		await TopicsPage.waitUntilGroupsCount(1);
		const topic1Row = await TopicsPage.getRow(topic1);
		await expect(topic1Row).toBeDisplayed();

		// Empty search bar
		await TopicsPage.search('');

		// Delete created topics
		await TopicsPage.deleteTopic(topic1);
		await TopicsPage.deleteTopic(topic2);
	});

	// TODO: check on watermarks and topic state
});

describe('Messages', () => {
	it('should send a message', async () => {
		await TopicsPage.createTopic(topicName);

		const topicRow = await TopicsPage.getRow(topicName);
		const messagesLink = await topicRow.$('a[title=Messages]');
		await click(messagesLink);

		const listItems = await MessagesPage.list.$$('li');
		await expect(listItems).toHaveLength(0);

		await MessagesPage.sendMessage();
		await MessagesPage.waitUntilMessagesCount(1);
	});

	it('should send a message from an already sent message', async () => {
		await MessagesPage.sendMessage(0);
		await MessagesPage.waitUntilMessagesCount(2);
	});

	it('should stop and restart the listener', async () => {
		await MessagesPage.stopListener();

		const producer = await getProducer();
		const message: Message = {
			key: JSON.stringify({some: 'key'}),
			value: JSON.stringify({some: 'value'})
		};
		await producer.send({topic: topicName, messages: [message]});

		// Make sure the listener is really stopped
		await sleep(1000);
		await MessagesPage.waitUntilMessagesCount(2);

		MessagesPage.startListener();
		await MessagesPage.waitUntilMessagesCount(3);
	});

	// TODO: test search
});

describe('Groups', () => {
	it('should see consumer group', async () => {
		const groupsLink = await $('a=Groups');
		await click(groupsLink);

		await GroupsPage.waitUntilGroupsCount(0);

		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '2'}]});

		await GroupsPage.refresh();
		await GroupsPage.waitUntilGroupsCount(1);

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
		await GroupsPage.waitUntilGroupsCount(0);
	});

	it('should delete new consumer group', async () => {
		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId, topic: topicName, partitions: [{partition: 0, offset: '3'}]});

		await GroupsPage.refresh();
		await GroupsPage.waitUntilGroupsCount(1);

		await GroupsPage.deleteGroup(groupId);

		// The group should disappear
		await GroupsPage.waitUntilGroupsCount(0);
	});

	it('should search', async () => {
		const group1 = 'group1';
		const group2 = 'group2';

		// Commit offsets to see the group in the list
		const admin = await getAdmin();
		await admin.setOffsets({groupId: group1, topic: topicName, partitions: [{partition: 0, offset: '3'}]});
		await admin.setOffsets({groupId: group2, topic: topicName, partitions: [{partition: 0, offset: '3'}]});

		await GroupsPage.refresh();
		await GroupsPage.waitUntilGroupsCount(2);

		await GroupsPage.search(group1);

		await GroupsPage.waitUntilGroupsCount(1);
		const group1Row = await GroupsPage.getRow(group1);
		await expect(group1Row).toBeDisplayed();
	});

	// TODO: test state
});
