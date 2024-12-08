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
              <span class="sender">
                <span v-if="!isMine(message)" class="status-indicator" :class="getUserStatusClass(message)"></span>
                {{ message.author.nickname }}
              </span>
              <span class="time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="bubble">
              <div v-html="message.content"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="typing-indicator-container">
        <div v-if="activeTypers.length > 0 && props.userState !== 'offline'" class="typing-indicator q-px-md">
          <div v-for="typer in activeTypers" :key="typer.nickname" class="cursor-pointer hover:underline"
            @click="toggleTyperExpansion(typer.nickname)">
            <span v-if="expandedTypers.includes(typer.nickname)">
              {{ typer.nickname }}: {{ typer.content }}
            </span>
            <span v-else>
              {{ typer.nickname }} is typing...
            </span>
          </div>
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
import { ref, nextTick, onMounted, onUnmounted, watch, computed } from 'vue'
import { useStore } from 'src/store';
import { SerializedMessage } from 'src/contracts'
import { handleCommand } from 'src/utils';
import { channelService } from 'src/services';
import activityService from 'src/services/ActivityService'

// define props
const props = defineProps<{
  activeChannel: string
  userState: 'online' | 'offline' | 'dnd'
}>()

// define store
const store = useStore()

// State refs
const isLoading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const text = ref('');
const expandedTypers = ref<string[]>([]);
const TYPING_TIMEOUT = 3000;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

// Infinite scroll handler
const infiniteScroll = async () => {
  if (isLoading.value) return;
  console.log('loading')

  const container = chatContainer.value;
  if (!container || messages.value.length === 0) return;

  // trigger when near the top (within 100px) 
  if (container.scrollTop < 100 && messages.value.length >= 30) {
    isLoading.value = true;

    // store the current scroll positions
    const scrollHeight = container.scrollHeight;
    const scrollTop = container.scrollTop;

    try {
      // Get oldest message for reference
      const oldestMessage = messages.value[0];

      // Add small delay to prevent rapid loading
      await new Promise(resolve => setTimeout(resolve, 600));

      // Dispatch action to load more messages
      console.log('dispatch')
      await store.dispatch('channels/loadMoreMessages', {
        channel: props.activeChannel,
        timestamp: oldestMessage.createdAt,
        messageId: oldestMessage.id
      });

      await nextTick(() => {
        if (container) {
          // Calculate and maintain scroll position
          const newScrollHeight = container.scrollHeight;
          const heightDifference = newScrollHeight - scrollHeight;
          container.scrollTop = scrollTop + heightDifference;
        }
      });

    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      isLoading.value = false;
    }
  }
};

// Computed properties
const currentUser = computed(() => store.state.auth.user);

const rawMessages = computed(() => {
  const msgs = store.getters['channels/currentMessages'] || [];

  if (props.userState === 'offline') {
    const lastOnlineTimestamp = activityService.getLastOnlineTimestamp();
    if (lastOnlineTimestamp) {
      return msgs.filter((msg: SerializedMessage) =>
        new Date(msg.createdAt) <= new Date(lastOnlineTimestamp)
      );
    }
  }

  return msgs;
});

const messages = computed(() => {
  if (!currentUser.value?.nickname) return rawMessages.value;

  return rawMessages.value.map((message: any) => {
    const mentionPattern = new RegExp(`@${currentUser.value?.nickname}\\b`, 'gi');
    const hasMention = mentionPattern.test(message.content);

    if (hasMention) {
      return {
        ...message,
        content: `<span class="mention-highlight">${message.content}</span>`
      };
    }

    return message;
  });
});

const typingUsers = computed(() => {
  return store.getters['channels/typingUsers'](props.activeChannel)
});

const activeTypers = computed(() => {
  const now = Date.now()

  type TypingUser = {
    timestamp: number;
    user: {
      nickname: string;
      content: {
        content: string
      }
    }
  }

  return (Object.entries(typingUsers.value) as [string, TypingUser][])
    .filter(([_, typer]) => now - typer.timestamp < TYPING_TIMEOUT)
    .filter(([_, typer]) => typer.user.nickname !== currentUser.value?.nickname)
    .filter(([_, typer]) => !typer.user.content?.content?.startsWith('/'))
    .map(([_, typer]) => ({
      nickname: typer.user.nickname,
      content: typer.user.content.content
    }))
});

// Watchers
watch(messages, (newMessages, oldMessages) => {
  // Only scroll if:
  // 1. This is a new message being added (length increased by 1)
  // 2. The new message is from the current user or it's the first load
  const isNewMessage = oldMessages && newMessages.length === oldMessages.length + 1;
  const isFirstLoad = !oldMessages || oldMessages.length === 0;
  const currentMessage = newMessages[newMessages.length - 1];
  const isMyMessage = currentMessage?.author.id === currentUser.value?.id;

  if ((isNewMessage && isMyMessage) || isFirstLoad) {
    if (isNewMessage) {
      text.value = ''; // Clear input only when sending a new message
    }
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    });
  }
}, { deep: true });

watch(text, (newValue) => {
  if (!props.activeChannel) return;

  if (newValue.trim()) {
    channelService.in(props.activeChannel)?.emitTyping(true, newValue);

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      channelService.in(props.activeChannel)?.emitTyping(false);
    }, TYPING_TIMEOUT);
  } else {
    if (typingTimeout) clearTimeout(typingTimeout);
    channelService.in(props.activeChannel)?.emitTyping(false);
  }
});

// Methods
const isMine = (message: SerializedMessage): boolean => {
  if (!currentUser.value) return false;
  return message.author.id === currentUser.value.id;
};

const toggleTyperExpansion = (nickname: string) => {
  if (expandedTypers.value.includes(nickname)) {
    expandedTypers.value = expandedTypers.value.filter(n => n !== nickname);
  } else {
    expandedTypers.value.push(nickname);
  }
};

const handleInput = async () => {
  const inputText = text.value.trim();

  if (inputText !== '') {
    if (inputText.startsWith('/')) {
      const command = inputText.slice(1).trim();
      if (!handleCommand(command, store)) {
        console.error('Unrecognized command: ', command);
      }
    } else {
      await sendMessage();
    }
  }
};

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

const getUserStatusClass = (message: SerializedMessage): string => {
  if (isMine(message)) return '';

  const currentChannel = props.activeChannel;
  const channelMembers = store.state.channels.members[currentChannel] || [];
  const isChannelMember = channelMembers.some(member => member.id === message.author.id);

  if (!isChannelMember) {
    return 'status-non-member';
  }

  const userState = store.getters['activity/getUserState'](message.author.id);
  switch (userState) {
    case 'dnd':
      return 'status-dnd';
    case 'online':
      return 'status-online';
    default:
      return 'status-offline';
  }
};

const shouldShowDateDivider = (index: number): boolean => {
  if (index === 0) return true;

  const currentMessage = messages.value[index];
  const previousMessage = messages.value[index - 1];

  return !isSameDate(currentMessage.createdAt, previousMessage.createdAt);
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
};

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
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Lifecycle hooks
onMounted(() => {
  if (chatContainer.value) {
    chatContainer.value.addEventListener('scroll', infiniteScroll);
  }
});

onUnmounted(() => {
  if (chatContainer.value) {
    chatContainer.value.removeEventListener('scroll', infiniteScroll);
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
});
</script>

<style>
.mention-highlight {
  background-color: rgba(244, 244, 39, 0.3);
  padding: 0 2px;
  border-radius: 2px;
  display: inline-block;
}
</style>

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
  margin-bottom: 8px;
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

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 4px;
}

.status-online {
  background-color: #4CAF50;
}

.status-offline {
  background-color: #9e9e9e;
}

.status-dnd {
  background-color: #f44336;
}

.status-non-member::after {
  content: '×';
  font-size: 8px;
  color: #000000;
  background-color: #9e9e9e;
  font-weight: bold;
}

.bubble {
  overflow-wrap: break-word;
  /* Modern version of word-wrap */
  white-space: pre-wrap;
  /* Preserve whitespace and wraps */
  max-width: 40%;
  /* Prevent messages from stretching too wide */
}
</style>
