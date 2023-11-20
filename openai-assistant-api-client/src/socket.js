import { reactive } from 'vue'
import { io } from 'socket.io-client'

export const state = reactive({
    id: '',
    connected: false,
    messageEvents: [],
    messageTrigger: [],
    connectTrigger: [],
    systemTrigger: [],
})

const url = `http://${import.meta.env.VITE_SERVER_IPADDRESS}:${import.meta.env.VITE_SERVER_PORT}`

export const socket = io(url, { autoConnect: false })

socket.on('connect', () => {

    state.id = socket.id

    console.log('connect', socket.id, (new Date()).toLocaleTimeString())

    state.connected = true

    state.connectTrigger[0] = Date.now()

})

socket.on('welcome', () => {

    console.log('welcome', (new Date()).toLocaleTimeString())

    state.systemTrigger[0] = { type: 'welcome', iat: Date.now() }

})

socket.on('message-list', (data) => {

    console.log('message-list', data, (new Date()).toLocaleTimeString())

    state.messageEvents.push(...data)

    state.messageTrigger[0] = Date.now()

})

socket.on('join', (data) => {

    console.log('join', data, (new Date()).toLocaleTimeString())

    state.systemTrigger[0] = { type: 'join', data, iat: Date.now() }

})

socket.on('leave', (data) => {

    console.log('leave', data, (new Date()).toLocaleTimeString())

    state.systemTrigger[0] = { type: 'leave', data, iat: Date.now() }

})

socket.on('disconnect', () => {

    console.log('disconnect', (new Date()).toLocaleTimeString())

    state.connected = false

    state.systemTrigger[0] = { type: 'disconnect', iat: Date.now() }

})

socket.on('message', (data) => {

    console.log('message', data, (new Date()).toLocaleTimeString())

    state.messageEvents.push(data)

    state.messageTrigger[0] = Date.now()

})

socket.on('ai-start', () => {

    console.log('ai-start', (new Date()).toLocaleTimeString())

    state.systemTrigger[0] = { type: 'ai-start', iat: Date.now() }

})

socket.on('ai-end', () => {

    console.log('ai-end', (new Date()).toLocaleTimeString())

    state.systemTrigger[0] = { type: 'ai-end', iat: Date.now() }

})