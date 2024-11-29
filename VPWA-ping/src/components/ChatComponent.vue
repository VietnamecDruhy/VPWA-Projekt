<template>
  <q-page dark class="bg-dark text-white sf-pro-500">
    <div class="chat-container">
      <div class="chat-messages" ref="chatContainer">
        <div v-if="isLoading" class="text-center q-pa-md">
          <q-spinner color="primary" size="3em" />
        </div>

        <div>
          <div v-for="(message, index) in messages" :key="index" :class="[
            'chat-message',
            isMine(message) ? 'me' :
              message.author.nickname === 'system' ? 'system' : 'other'
          ]" :style="{
            'justify-content': isMine(message) ? 'flex-end' : 'flex-start'
          }">
            <div v-if="shouldShowDateDivider(index)" class="date-divider">
              <span>{{ formatDate(message.createdAt) }}</span>
              <hr />
            </div>

            <div class="message-header">
              <span class="sender">{{ message.author.nickname }}</span>
              <span class="time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="bubble">
              <div v-html="message.content"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="typing-indicator-container">
        <div v-if="activeTypers.length > 0" class="typing-indicator q-px-md">
          <span>
            {{ activeTypers.map(t => `${t.nickname}: ${t.content || 'is typing...'}`).join(', ') }}
          </span>
        </div>
      </div>

      <div class="chat-input-bar">
        <q-input rounded standout="true" v-model="text" class="sf-pro-500" bg-color="grey-9" text-color="grey-5" dense
          @keyup.enter="handleInput">
          <template v-slot:append>
            <q-btn flat round dense icon="arrow_upward" color="dark" @click="handleInput" />
          </template>
        </q-input>
      </div>
    </div>
  </q-page>
</template>


<script setup lang="ts">
// import ChatComponent from '../utils/ChatComponentLogic'
// export default ChatComponent

import { ref, nextTick, onMounted, onUnmounted, watch, Ref, computed, defineComponent } from 'vue'
import { useQuasar, QNotifyCreateOptions, scroll } from 'quasar'
import { useStore } from 'src/store';
import { SerializedMessage } from 'src/contracts'
import { handleCommand } from 'src/utils';
import { channelService } from 'src/services';


// define props
const props = defineProps<{
  activeChannel: string
}>()

// define store
const store = useStore()

// Infinite scroll
let isLoading = false;  // Flag to prevent multiple simultaneous loads

const infiniteScroll = async () => {
  if (isLoading) return;

  const container = chatContainer.value;
  if (!container || messages.value.length === 0) return;

  // Only trigger when near the top (within 100px) 
  if (container.scrollTop < 100 && messages.value.length >= 30) {
    isLoading = true;

    // Store the current scroll positions
    const scrollHeight = container.scrollHeight;
    const scrollTop = container.scrollTop;

    try {
      // Get oldest message for reference
      const oldestMessage = messages.value[0];

      // Add loading delay for UX
      await new Promise(resolve => setTimeout(resolve, 400));

      // Dispatch action to load more messages
      await store.dispatch('channels/loadMoreMessages', {
        channel: props.activeChannel,
        timestamp: oldestMessage.createdAt,
        messageId: oldestMessage.id
      });

      // After store update, wait for DOM to update
      await nextTick(() => {
        if (container) {
          // Calculate the new scroll position
          const newScrollHeight = container.scrollHeight;
          const heightDifference = newScrollHeight - scrollHeight;

          // Adjust scroll position to maintain user's view
          container.scrollTop = scrollTop + heightDifference;
        }
      });

    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      isLoading = false;
    }
  }
};

// On mount add a event listener for loading new messages 
onMounted(() => {
  console.log('props:', props.activeChannel)
  if (chatContainer.value) {
    chatContainer.value.addEventListener('scroll', infiniteScroll)
  }
})

// watch join channel to load messages, create socket to listen for new messages
watch(() => props.activeChannel, async (newChannel) => {
  if (newChannel) {
    store.commit('channels/SET_ACTIVE', newChannel)
    await store.dispatch('channels/join', newChannel)
    console.log('Joined new channel:', newChannel)
  }
}, { immediate: true })

// get messages through store
const messages = computed(() => {
  const msgs = store.getters['channels/currentMessages'] || [];
  return msgs;
})

// current user
const currentUser = computed(() => store.state.auth.user)

// check owner of the message
const isMine = (message: SerializedMessage): boolean => {
  if (!currentUser.value) return false
  return message.author.id === currentUser.value.id
}

// watch for new messages to scroll down
const chatContainer = ref<HTMLElement | null>(null)

watch(messages, () => {
  const currentMessage = messages.value[messages.value.length - 1];

  if (currentMessage.author.id === currentUser.value?.id) {
    text.value = '';
  }

  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });

}, { deep: true });


// typing watcher
const text = ref('')
const TYPING_TIMEOUT = 3000
let typingTimeout: ReturnType<typeof setTimeout> | null = null

const typingUsers = computed(() => {
  return store.state.channels.typingUsers[props.activeChannel] || {}
})

const activeTypers = computed(() => {
  const now = Date.now()
  return Object.entries(typingUsers.value)
    .filter(([_, typer]) => now - typer.timestamp < TYPING_TIMEOUT)
    .filter(([_, typer]) => typer.user.nickname !== currentUser.value?.nickname)
    .map(([_, typer]) => ({
      nickname: typer.user.nickname,
      content: typer.user.content.content
    }))
})

// Update text watcher
watch(text, (newValue) => {
  if (!props.activeChannel) return

  if (newValue.trim()) {
    channelService.in(props.activeChannel)?.emitTyping(true, newValue)

    if (typingTimeout) clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      channelService.in(props.activeChannel)?.emitTyping(false)
    }, TYPING_TIMEOUT)
  } else {
    if (typingTimeout) clearTimeout(typingTimeout)
    channelService.in(props.activeChannel)?.emitTyping(false)
  }
})

// send message
const handleInput = async () => {
  const inputText = text.value.trim()

  if (inputText !== '') {
    if (inputText.startsWith('/')) {
      const command = inputText.slice(1).trim().toLowerCase()
      if (!handleCommand(command, store)) {
        console.error('Unrecognized command: ', command)
      }
    } else {
      await sendMessage()
    }
  }
}

const sendMessage = async () => {
  try {
    await store.dispatch('channels/addMessage', {
      channel: props.activeChannel,
      message: text.value
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
};



// misc
const shouldShowDateDivider = (index: number): boolean => {
  if (index === 0) return true

  const currentMessage = messages.value[index]
  const previousMessage = messages.value[index - 1]

  return !isSameDate(currentMessage.createdAt, previousMessage.createdAt)
}

const formatDate = (timestamp: string): string => {
  const date1 = new Date(timestamp);
  return date1.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
}

const isSameDate = (timestamp1: string, timestamp2: string): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatTime = (timestamp: string): string => {
  const date1 = new Date(timestamp)
  return date1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>


<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.me.chat-message {
  align-items: flex-end;
}

.message-header .sender {
  margin-right: 10px;
}

.message-header {
  padding-left: 10px;
  padding-right: 10px;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 40px 0;
  position: relative;
}

.date-divider span {
  padding: 0 10px;
  margin-bottom: 20px;
  font-weight: bold;
  color: grey;
  /* Grey font for the date */
}

.date-divider hr {
  position: absolute;
  width: 100%;
  top: 50%;
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.5);
  /* Slightly transparent grey line */
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
}

.highlighted {
  font-weight: bold;
  color: #F2C037;
}

.typing-indicator-container {
  height: 24px;
  /* Adjust this value based on your design needs */
  margin-bottom: 8px;
  /* Add some space between the typing indicator and the input */
}

.typing-indicator {
  font-style: italic;
  color: #aaa;
  animation: fadeInOut 1.5s infinite;
  cursor: pointer;
}

.typing-indicator:hover {
  text-decoration: underline;
}
</style>
