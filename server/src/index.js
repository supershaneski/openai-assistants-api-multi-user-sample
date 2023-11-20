const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const app = express()
const server = http.createServer(app)

const utils = require('./lib/utils')
const openai = require('./services/openai')

require('dotenv').config()

const io = new Server(server, {
    maxHttpBufferSize: 1e8, /* 100MB */
    cors: {
        origin: [`http://localhost:${process.env.CLIENT_PORT}`, `http://${process.env.SERVER_HOST}:${process.env.CLIENT_PORT}`],
        methods: ['GET', 'POST']
    }
})

app.use(cors())
//app.use(bodyParser.json())
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

app.get('/', (req, res) => {

    res.status(200).json({ message: 'Hello, world!' })

})

let assistant_instructions = ''
let assistant_name = ''
let thread_id = ''
let users = []

io.on('connection', (socket) => {

    console.log('user connected', socket.id)

    let socket_id = socket.id
    let socket_user_id = ''
    let socket_user_name = ''

    users.push({ id: socket_id, user_id: '', name: '' })

    socket.on('disconnect', async () => {

        console.log('disconnect', socket_id)

        const { user_id, name } = users.find((user) => user.id === socket_id)

        socket.broadcast.emit('leave', { user_id, name })
        
        users = users.filter(user => user.id !== socket_id)
        
        if(users.length === 0 && thread_id) {
            
            console.log('delete thread')

            try {
                const ret = await openai.deleteThread({ threadId: thread_id })
                console.log(ret)
            } catch(error) {
                console.log(error.name, error.message)
            } finally {
                thread_id = ''
            }

        }

    })

    socket.on('register', async (params) => {

        console.log('register', params)

        const { user_id, name } = params

        users = users.map(user => ({
            ...user,
            user_id: user.id === socket_id ? user_id : user.user_id,
            name: user.id === socket_id ? name : user.name,
        }))

        if(!thread_id) {

            try {

                const assistant = await openai.getAssistant()
                assistant_name = assistant.name
                assistant_instructions = assistant.instructions

                const thread = await openai.createThread()

                thread_id = thread.id

                console.log('create thread', thread_id)

            } catch(error) {
                console.log(error.name, error.message)
            }

        } else {

            try {

                const message_list = await openai.getMessages({ threadId: thread_id })

                console.log("messages", message_list)

                let new_messages = []

                for(let i = 0; i < message_list.length; i++) {
                    const msg = message_list[i]

                    //console.log(msg)

                    new_messages.push({
                        user_id: null,
                        name: assistant_name,
                        id: msg.id,
                        created_at: msg.created_at.toString().padEnd(13, 0),
                        role: msg.role,
                        content: msg.content[0].text.value
                    })

                }

                if(new_messages.length > 0) {
                    socket.emit('message-list', new_messages)
                }

            } catch(error) {
                console.log(error.name, error.message)
            }

        }

        socket_user_id = user_id
        socket_user_name = name

        socket.broadcast.emit('join', { user_id, name })
        
        socket.emit('welcome')

    })

    socket.on('message', async (message) => {

        console.log('message', message)
        
        socket.broadcast.emit('message', message)

        socket.emit('ai-start')
        socket.broadcast.emit('ai-start')

        try {

            const message_id = message.id

            const ret_message = await openai.addMessage({ threadId: thread_id, message: message.content, messageId: message_id })

            console.log('message', ret_message)

            const run = await openai.startRun({ 
                threadId: thread_id,
                instructions: assistant_instructions + `\nPlease address the user as ${socket_user_name}.\nToday is ${new Date()}.`
             })

            console.log('run', run)

            const run_id = run.id

            let messages_items = []
            let flagFinish = false

            let MAX_COUNT = 2 * 600 // 120s 
            let TIME_DELAY = 100 // 100ms
            let count = 0

            do {

                console.log(`Loop: ${count}`)
    
                const run_data = await openai.getRun({ threadId: thread_id, runId: run_id })
    
                const status = run_data.status
    
                console.log(`Status: ${status} ${(new Date()).toLocaleTimeString()}`)
    
                if(status === 'completed') {
    
                    const messages = await openai.getMessages({ threadId: thread_id })
    
                    console.log('messages-show', messages)

                    let new_messages = []

                    for(let i = 0; i < messages.length; i++) {
                        const msg = messages[i]

                        //console.log(JSON.stringify(msg, null, 2))
                        
                        if (Object.prototype.hasOwnProperty.call(msg.metadata, 'id'))  {
                            if(msg.metadata.id === message_id) {
                                break
                            }
                        } else {
                            
                            new_messages.push({
                                user_id: null,
                                name: assistant_name,
                                id: msg.id,
                                created_at: msg.created_at.toString().padEnd(13, 0),
                                role: msg.role,
                                content: msg.content[0].text.value
                            })
                        }

                    }

                    messages_items = new_messages
    
                    flagFinish = true
                
                } else if(status === 'requires_action'){
                    
                    console.log('run-data', run_data)
    
                    const required_action = run_data.required_action
                    const required_tools = required_action.submit_tool_outputs.tool_calls
    
                    console.log('required-action', required_action)
                    console.log('required-tools', required_tools)
                    
                    const tool_output_items = []
    
                    required_tools.forEach((rtool) => {
                        
                        // We will not handle function calling
                        let tool_output = { status: 'error', message: 'No function found' }
    
                        tool_output_items.push({
                            tool_call_id: rtool.id,
                            output: JSON.stringify(tool_output)
                        })
    
                    })
    
                    console.log('tools-output', tool_output_items)
    
                    const ret_tool = await submitOutputs({
                        threadId: thread_id,
                        runId: run_id,
                        tool_outputs: tool_output_items
                    })
    
                    console.log('ret-tool', ret_tool)
    
                } else if(status === 'expired' || status === 'cancelled' || status === 'failed') {
                    
                    flagFinish = true
    
                }
                
                if(!flagFinish) {
    
                    count++
                    
                    if(count >= MAX_COUNT) {
    
                        flagFinish = true
    
                    } else {
    
                        await utils.wait(TIME_DELAY)
    
                    }
    
                }
    
            } while(!flagFinish)

            socket.broadcast.emit('message-list', messages_items)
            socket.emit('message-list', messages_items)

        } catch(error) {

            console.log(error.name, error.message)

            const error_message = {
                user_id: '',
                name: 'system',
                content: error.message,
                role: 'system',
                id: utils.getSimpleId(),
                created_at: Date.now()
            }

            socket.broadcast.emit('message', error_message)
            socket.emit('message', error_message)

        } finally {

            socket.emit('ai-end')
            socket.broadcast.emit('ai-end')

        }

    })


})

server.listen(process.env.SERVER_PORT, () => {

    console.log(`Starting Test Server...`, (new Date()).toLocaleTimeString())
    console.log(`Listening on ${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`)

})

process.on('SIGINT', async () => {
    console.log("\nTest Server process terminated.");

    // cleanup
    if(thread_id) {

        try {
            const ret = await openai.deleteThread({ threadId: thread_id })
            console.log(ret)
        } catch(error) {
            console.log(error.name, error.message)
        }

    }

    process.exit();
})

process.on('SIGTERM', async () => {
    console.log("\nTest Server process terminated.");

    // cleanup
    if(thread_id) {

        try {
            const ret = await openai.deleteThread({ threadId: thread_id })
            console.log(ret)
        } catch(error) {
            console.log(error.name, error.message)
        }

    }
    
    process.exit();
})