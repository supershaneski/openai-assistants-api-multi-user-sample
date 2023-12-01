openai-api-function-call-sample
======

This sample project is a proof-of-concept (POC) demonstration of the [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)’s capability to handle single-threaded interactions with multiple users. It features a full-stack application that utilizes a **Node.js Express** server and a **Vue.js** client. The application employs **socket.io** to facilitate bidirectional communication via websockets between the server and client applications.

---

このサンプルプロジェクトは、[OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)がシングルスレッドで複数のユーザーとの対話を処理する能力をデモンストレーションするためのプルーフ・オブ・コンセプトです。これは、**Node.js Express**サーバーと**Vue.js**クライアントを使用したフルスタックアプリケーションで、**socket.io**を使用してサーバーとクライアントアプリケーション間のウェブソケットを介した双方向通信を実現しています。


**Updated**: Added [mock streaming](#mock-streaming).

# App

![Sample discussion](./docs/screenshot1.png "Sample discussion")

When you first run the client application, you will be asked to provide a nickname.

![Nickname](./docs/screenshot3.png "Nickname")

The nickname you entered will then be used as additional info for the AI.

```javascript
const run = await openai.startRun({ 
    threadId: thread_id,
    instructions: assistant_instructions + `\nPlease address the user as ${socket_user_name}.\nToday is ${new Date()}.`
    })
```

# Assistants API

This app requires that the Assistant be made in the [Playground](https://platform.openai.com/assistants) for simplicity.
Just copy the assistant id and [edit the .env for the server](#nodejs-express-server).

![Assistant](./docs/screenshot2.png "Assistant")

When the first user connects to the server, a new thread is created and its `thread id` stored.
In this demo, we will be just storing the thread id in a simple global variable.
I will also get the ***instructions*** and ***name*** of the **Assistant** at the same time which will be useful for displaying the Assistant name in the client UI and appending instruction during run, respectively.

```javascript
const assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID)
assistant_name = assistant.name
assistant_instructions = assistant.instructions

const thread = await openai.beta.threads.create()

thread_id = thread.id
```

If the thread has been running already, previous messages will be retrieved and sent to the user.

```javascript
const message_list = await openai.beta.threads.messages.list(thread_id)

socket.emit('message-list', message_list)
```

When the user sends a message, first, it will be broadcast to the others using **socket.io** emit function and then it will be added to the thread and a run will be started. I also send a **socket.io** event to disable input and send button in the clients and re-enables it again after response is received.

```javascript
socket.on('message', async (message) => {

    // send messages to other connected users
    socket.broadcast.emit('message', message)

    // disable input and button in client
    socket.emit('ai-start')
    socket.broadcast.emit('ai-start')

    try {

        const message_id = message.id

        const ret_message = await openai.beta.threads.messages.create(thread_id, message)

        const run = await openai.beta.threads.runs.create(
            thread_id,
            {
                assistant_id: process.env.OPENAI_ASSISTANT_ID,
                instructions: assistant_instructions + `\nPlease address the user as ${user_name}.\nToday is ${new Date()}.`
            }
        )
        
        ...
        
    } catch(error) {
        console.log(error)
    }

})
```

When the run starts, we will then use a **do while loop** to wait until the status became `completed`. Please note that for simplicity, we will not be handling any **function calling**. In case your Assistant have function call, and it is invoked, the response will be:

```javascript
{ status: 'error', message: 'No function found' }
```

After the status becomes `completed`, we will then take the newest messages. The retrieve message function will actually send all the messages in the thread. But we will store the last message id in the metadata to know the last message to cutoff.

```javascript
const last_message_id = user_message.id

metadata['id'] = last_message_id

const ret_message = await await openai.beta.threads.messages.create(thread_id, {
    role: 'user',
    content: user_message,
    metadata,
})

...

const all_messages = await openai.beta.threads.messages.list(thread_id)

let new_messages = []

for(let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    if(msg.metadata.id === message_id) {
        break
    } else {
        ...
    }
}

socket.broadcast.emit('message-list', new_messages) // to others
socket.emit('message-list', new_messages) // to sender

// re-enables the input and button in clients
socket.emit('ai-end')
socket.broadcast.emit('ai-end')
```

When the last user disconnects to the server, like by closing the browser, the thread id will be deleted.

```sh
{
  id: 'thread_iL9IhwX5ds06UgbpG3zcyFQZ',
  object: 'thread.deleted',
  deleted: true
}
```

Be sure to delete the threads properly because currently we do not have any API to retrieve running threads.


# Mock Streaming

As of this writing, **Assistants API** has no streaming capability like **Chat Completions API** does. However, we can simulate it by simply streaming the response. For this sample, I set aside a separate endpoint for streaming (e.g. /stream) outside socket.io handler. In the client app, just enable **streaming** from the toggle button at the bottom to start streaming.

![Mock Streaming](./docs/assistant-api-streaming.gif "Mock Streaming")

For the server handling, check [stream endpoint](/server/src/index.js) handler

```javascript
app.post('/stream', async (req, res) => {

    ...

    const ret_message = await openai.addMessage({ 
        threadId: thread_id, 
        message: content, 
        messageId: message_id, 
        userId: user_id, 
        name: name 
    })
    
    const run = await openai.startRun({ 
        threadId: thread_id,
        instructions: assistant_instructions + `\nPlease address the user as ${name}.\nToday is ${new Date()}.`
    })

    const run_id = run.id

    // Start streaming response
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
    })

    do {

        const run_data = await openai.getRun({ threadId: thread_id, runId: run_id })

        const status = run_data.status

        if(status === 'completed') {

            const messages = await openai.getMessages({ threadId: thread_id })

            for(let i = 0; i < messages.length; i++) {
                const msg = messages[i]

                if (Object.prototype.hasOwnProperty.call(msg.metadata, 'id'))  {
                    if(msg.metadata.id === message_id) {
                        break
                    }
                } else {
                    
                    const output_data = msg.content[0].text.value
                    const split_words = output_data.split(' ')

                    // We will simulate streaming per word! :P
                    for(let word of split_words) {
                        // stream text
                        res.write(`${word} `)
                        // add delay
                        await utils.wait(TIME_DELAY)
                    }
                    
                }

            }

            flagFinish = true
            
        } else {

            ...

        }

    } while(!flagFinish)

    // End streaming
    res.end()

}
```

When we receive the messages from the API, we break it down to single words then we send each word one by one, which simulates streaming behavior.

```javascript
const output_data = msg.content[0].text.value

// divide output into words
const split_words = output_data.split(' ')

for(let word of split_words) {

    // send one word at a time
    res.write(`${word} `)

    // add delay
    await utils.wait(TIME_DELAY)
}
```

For client side, we [handle it](/openai-assistant-api-client/src/views/HomeView.vue) separate from sending to socket.io handler

```javascript
async function sendToStream(user_message) {

  ...

  try {

    const response = await fetch(`http://${import.meta.env.VITE_SERVER_IPADDRESS}:${import.meta.env.VITE_SERVER_PORT}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user_message)
    })

    // message id for incoming message
    const msg_id = getSimpleId()

    // initialize assistant message
    let assistant_message = { 
      user_id: null,
      name: 'CatGPT', 
      content: '', 
      role: 'assistant', 
      id: msg_id, 
      created_at: Date.now() 
    }
    state.messageEvents.push(assistant_message)

    const reader = response.body.getReader()

    let flag = true

    while(flag) {

      const { done, value } = await reader.read()

      if(done) {
        flag = false
        break
      }
      
      // receive stream
      const text = new TextDecoder().decode(value)

      // update assistant message using message id we saved from above
      state.messageEvents = state.messageEvents.map((item) => {
        return {
          ...item,
          content: item.id === msg_id ? item.content + text : item.content
        }
      })

      ...

    }
    
}
```

Since we are sending our message outside the socket.io handler, the message and response will not appear in the other connected users until they refresh. I have not yet checked if streaming is possible using socket.io.


# Setup

Clone the repository

```sh
git clone https://github.com/supershaneski/openai-assistants-api-multi-user-sample.git myproject

cd myproject

ls -l
```

## Node.js Express server

First, let us setup the server. Go to the server directory and install dependencies

```sh
cd server

npm install
```

Then, copy `.env.example` and rename it to `.env` then edit the `OPENAI_API_KEY` and use your own API_KEY.
From the [OpenAI Assistants page](https://platform.openai.com/assistants), copy the assistant id and edit `OPENAI_ASSISTANT_ID`.

```sh
OPENAI_API_KEY=YOUR-OPENAI-API-KEY
OPENAI_ASSISTANT_ID=YOUR-OPENAI-ASSISTANT-ID
SERVER_HOST=localhost
SERVER_PORT=5020
CLIENT_PORT=5173
```

You can also edit the `SERVER_HOST` to use your IP Address if you want to use other devices connected to your server like tablet, smartphone, etc. Leave the port numbers as is.

To start the server

```sh
npm start
```

## Client app

From the root, go to the client app directory and install dependencies

```sh
cd openai-assistant-api-client

npm install
```

Then, copy `.env.example` and rename it to `.env`.

Now, if you edit the `SERVER_HOST` from `localhost` to actual IP Address when you setup your server, you also need to edit `VITE_SERVER_IPADDRESS` to that value. Leave the port numbers as is.

```
VITE_SERVER_IPADDRESS=localhost
VITE_SERVER_PORT=5020
```

Then run the client app

```sh
npm run dev
```

Open your browser to `http://localhost:5173/` to load the application page.
