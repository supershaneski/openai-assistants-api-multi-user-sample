openai-api-function-call-sample
======

This is a sample project that serves as a proof of concept to demonstrate using OpenAI Assistans API with multiple users. We will be implementing a simple web socket full stack application using Node.js Express and socket.io for the server, and Vue.js for the client.

# App

![Sample discussion](./docs/screenshot1.png "Sample discussion")



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

Now, if you edit the `SERVER_HOST` from `localhost` to actual IP Address, you also need to edit `VITE_SERVER_IPADDRESS` to that value. Leave the port numbers as is.

```
VITE_SERVER_IPADDRESS=localhost
VITE_SERVER_PORT=5020
```

Then run the client app

```sh
npm run dev
```

Open your browser to `http://localhost:5173/` to load the application page.
