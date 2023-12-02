# Tests to ensure Kafka Panel is working correctly
<!-- This is needed until tauri e2e testing is fixed https://github.com/tauri-apps/tauri/issues/7667 -->

## Connection

### Select connection success
- Select a working connection 
- **should see list of topics**
- Connect an external consumer to a topic 
- **should see changes in the topic state**

### Select connection error
- Select an invalid or unreachable connection 
- **should see error message and the topic selection modal is still visible after closing the error message and not closable**

### Select connection error when working connection already selected
- Select a working connection
- Select an invalid or unreachable connection 
- **should see error message**
- Close the error message
- **should see the select connection modal with the previous working connection selected**
- Close the modal
- **should see the topics list of the previous working connection**

## Topics

### Create topic
- Click create topic
- Set the name of the topic and create
- **should see the new topic in the topics list**

### Delete topic
- Click delete on the created topic
- **should see "are you sure" message**
- Click "OK"
- **should see topic list without deleted topic**

## Messages

### Send Message
- Click "Send message"
- Modify key and value
- Add header and edit key and value
- Click "Send"
- **should see new message in the messages list**

### Check validation in sending message
- Click "Send message"
- Empty the value field
- **should not be able to go to the next step**
- Put null in the value field
- **should be able to go to the next step**
- Create two headers
- Edit key and value of one of them
- **should not be able to send**
- Delete the empty header
- **should be able to send**

## Groups

### Commit latest offsets
- Create the conditions for a topic to have lag on a consumer group
- Click "Commit latest offsets" to the consumer group
- **should see low and high to the same number and lag to 0**

<!-- TODO: add delete consumer group and set to first -->

## Messages storage

### Save message from messages page
- Go to messages page in whatever topic
- Select a random message and click save in storage
- **should not be able to got forward without having any tags**
- Insert tag and message key and value and click "Save"
- **should see the message in the message storage with the right values**

### Edit message
- Click edit on a random message
- Add a header to the message and click "Save"
- **should see the message with the updated header**

### Delete message
- Click delete on a message
- **should not see the message anymore**

### Copy message
- Copy the content of a message with all elements (headers included)
- **should be able to paste with the same value**

### Send message
- Click send message on a message
- Use faker and key in the message template
- Send the message
- **should see the message with interpolated values in the topic's messages**

### Search message
- Search any message by tag
- **should see only the messages that match that filter**

## Autosend

### Start autosend
- Click "Start autosend"
- Change the configuration
- Go forward and back on the steps
- **should see the configuration we've changed**
- Change the template using faker on a header
- Click "Start"
- Go to the topic's messages
- **should see the incoming messages dynamically**

### Stop autosend
- Click on stop autosend
- Go to the topic's messages
- **should see the inflow of messages stopped**

## Settings

### Change messages
- Up the messages limit to 50
- Create an autosend
- Go to the topic's messages
- **should see at all times maximum 50 messages**

### Delete connection
- Remove connection from the code editor
- Go to the topics page
- **should see the connections list without the one we deleted**