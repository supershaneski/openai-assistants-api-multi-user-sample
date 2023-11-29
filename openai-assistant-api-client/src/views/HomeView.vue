<script setup>
import { onMounted, ref, computed, watch } from 'vue'

import { socket, state } from '@/socket'

import ToggleButton from '../components/ToggleButton.vue'
import DialogName from '../components/DialogName.vue'
import IconOpenAI from '../components/icons/IconOpenAI.vue'
import IconPerson from '../components/icons/IconPerson.vue'

import { getSimpleId } from '../lib/utils.js'
import LoadingText from '../components/LoadingText.vue'

import { useAppDataStore } from '../stores/appdata'

const store = useAppDataStore()

const messageRef = ref(null)
const inputRef = ref(null)
const userName = ref('')
const userId = ref('')
const message = ref('')
const isDialogShown = ref(false)
const isAIProcessing = ref(false)
const isConnecting = ref(false)

const isStreaming = ref(false)

function handleToggle(flag) {
  console.log("toggle", flag)
  isStreaming.value = flag
}

function sendToSocket(user_message) {

  state.messageEvents.push(user_message)

  socket.emit('message', user_message)

  message.value = ''

  resetScroll()

}

async function sendToStream(user_message) {

  isAIProcessing.value = true

  state.messageEvents.push(user_message)

  message.value = ''

  resetScroll()

  try {

    const response = await fetch(`http://${import.meta.env.VITE_SERVER_IPADDRESS}:${import.meta.env.VITE_SERVER_PORT}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user_message)
    })

    if(!response.ok) {
      console.log('Oops, an error occurred', response.status)
    }

    const msg_id = getSimpleId()

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

      const text = new TextDecoder().decode(value)

      state.messageEvents = state.messageEvents.map((item) => {
        return {
          ...item,
          content: item.id === msg_id ? item.content + text : item.content
        }
      })

      resetScroll()

    }

  } catch(error) {

    console.log(error.name, error.message)

  } finally {

    isAIProcessing.value = false

  }

}

function handleSend() {

  if(isAIProcessing.value) {
    return
  }

  console.log(Date.now())

  const user_message = { 
    user_id: userId.value, 
    name: userName.value, 
    content: message.value, 
    role: 'user', 
    id: getSimpleId(), 
    created_at: Date.now() 
  }

  if(isStreaming.value) {

    sendToStream(user_message)

  } else [

    sendToSocket(user_message)

  ]

  /*
  state.messageEvents.push(user_message)

  socket.emit('message', user_message)

  message.value = ''

  resetScroll()
  */

}

function handleSubmitName(value) {
  
  isConnecting.value = true

  userName.value = value
  store.setName(value)

  if(state.connected) {
    socket.emit('register', { user_id: userId.value, name: userName.value })
    isConnecting.value = false
  } else {
    socket.connect()
  }

}

function resetScroll() {
  
  setTimeout(() => {
    messageRef.value.scrollTop = messageRef.value.scrollHeight
  }, 300)

}

function showSystemMessage(name, stype) {

  const message_text = stype === 'welcome' ? `Welcome ${name}` : stype === 'disconnect' ? `You are disconnected from the server` : `${name} has ${stype === 'join' ? 'joined' : 'left'} the discussion`

  const system_message = { 
    user_id: '', 
    name: 'system', 
    content: message_text, 
    role: 'system', 
    id: getSimpleId(), 
    created_at: Date.now() 
  }

  state.messageEvents.push(system_message)

  resetScroll()

}

function getBackgroundClass(role, user_id) {
  if(role === 'system') {
    return 'system'
  } if(role === 'assistant') {
    return 'bot'
  } else {
    return user_id !== userId.value ? 'other' : 'user'
  }
}

function handleAIOnStart() {
  isAIProcessing.value = true
}

function handleAIOnEnd() {
  isAIProcessing.value = false
}

const messages = computed(() => {
  return state.messageEvents.sort((a, b) => {
    if(a.created_at > b.created_at) return 1
    if(a.created_at < b.created_at) return -1
    return 0
  })
})

watch(state.connectTrigger, () => {
    
  socket.emit('register', { user_id: userId.value, name: userName.value })
  isConnecting.value = false

})

watch(state.messageTrigger, () => {
  
  resetScroll()
  
})

watch(state.systemTrigger, ([ newval ]) => {
    
  console.log("system-trigger",  newval.type, newval.data)

  switch(newval.type) {
    case 'welcome':
      isDialogShown.value = false
      inputRef.value.focus()
      showSystemMessage(userName.value, newval.type)
      break
    case 'disconnect':
      showSystemMessage(userName.value, newval.type)
      break
    case 'leave':
    case 'join':
      showSystemMessage(newval.data.name, newval.type)
      break
    case 'ai-start':
      handleAIOnStart()
      break
    case 'ai-end':
      handleAIOnEnd()
      break
    default:
      //
  }
  
})

onMounted(() => {
  
  if(state.connected) {

    userId.value = store.id
    userName.value = store.name

  } else {

    const new_id = getSimpleId()
    userId.value = new_id
    store.setId(new_id)

    isDialogShown.value = true

  }

})
</script>

<template>
  <div class="container">
    <div class="messages" ref="messageRef">
      <div class="message-item" :class="{ rowReverse: msg.user_id !== userId }" v-for="(msg) in messages" :key="msg.id">
        <div class="message-contents" :class="{ marginLeft: msg.user_id !== userId, marginRight: msg.user_id === userId }">
          <div class="message-text" :class="getBackgroundClass(msg.role, msg.user_id)">{{ msg.content }}</div>
        </div>
        <div class="sender" v-if="msg.role !== 'system'">
          <div v-if="msg.role === 'user'" class="avatar">
            <IconPerson />
          </div>
          <div v-else class="avatar">
            <IconOpenAI />
          </div>
          <div class="sender-name">
            <span>{{ msg.name }}</span>
          </div>
        </div>
      </div>
      <div v-if="isAIProcessing" class="loading-text">
        <LoadingText />
      </div>
    </div>
    <div class="input">
      <input ref="inputRef" @keyup.enter="handleSend" placeholder="Send message" class="input-text" type="text" v-model="message" />
      <button :disabled="!message || isAIProcessing" @click="handleSend" class="button">Send</button>
    </div>
    <div class="footer">
      <div class="toggle">
        <ToggleButton :checked="isStreaming" @change="handleToggle" />
      </div>
    </div>
    <Teleport to="body">
      <DialogName :show="isDialogShown" :disabled="isConnecting" @submit="handleSubmitName" />
    </Teleport>
  </div>
</template>

<style scoped>
.toggle {
  position: relative;
}
.loading-text {
  position: relative;
  padding: 6px 0;
}
.sender {
  position: relative;
  width: 80px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}
.avatar {
  width: 24px;
  height: 24px;
  margin-top: 4px;
}
.sender-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
  text-align: center;
  line-height: 100%;
}
.sender-name span {
  font-size: .7rem;
  line-height: 100%;
}
.message-item {
  padding: 1rem 1rem 0 1rem;
  box-sizing: border-box;
  display: flex;
}
.message-item:last-child {
  padding-bottom: 1rem;
}
.avatar * {
  fill: #232;
}
.message-contents {
  flex-grow: 1;
}
.message-text {
  background-color: #fff;
  border-radius: 6px;
  padding: .6rem;
  white-space: pre-wrap;
}
.container {
  position: relative;
  height: 100vh;
}
.messages::-webkit-scrollbar {
  display: none;
}
.messages {
  scroll-behavior: smooth;
  background-color: aliceblue;
  position: relative;
  height: calc(100% - 100px);
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.input {
  position: relative;
  display: flex;
  padding: 1rem;
}
.button {
  appearance: none;
  background-color: #00DC82;
  border-width: 0;
  font-size: 1rem;
  color: #fff;
  width: 100px;
  height: 36px;
  cursor: pointer;
}
.button:active {
  background-color: #00DC8299;
}
.button:disabled {
  background-color: #999;
}
.input-text {
  background-color: #efefef;
  appearance: none;
  border-width: 0;
  font-size: 1rem;
  box-sizing: border-box;
  padding: 0 1rem;
  flex-grow: 1;
}
.footer {
  text-align: center;
}
.footer span {
  font-size: .6rem;
  font-style: italic;
}

.marginRight {
  margin-right: 8px;
}
.marginLeft {
  margin-left: 8px;
}
.rowReverse {
  flex-direction: row-reverse;
}
.user {
  background-color: #fff;
}
.other {
  background-color: #efefef;
}
.bot {
  background-color: #ccddff;
}
.system {
  background-color: transparent;
  text-align: center;
  font-size: .8rem;
  padding: 4px 0;
  color: #555;
}
</style>