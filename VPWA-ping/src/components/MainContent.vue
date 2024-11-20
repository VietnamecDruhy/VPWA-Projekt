<template>
  <q-page dark class="bg-dark text-white sf-pro-500">
    <div class="chat-container">
      <!-- Chat messages -->
      <div class="chat-messages" ref="chatContainer">
        <!-- Loading indicator -->
        <div v-if="isLoading" class="text-center q-pa-md">
          <q-spinner color="primary" size="3em" />
        </div>

        <div
          v-for="(message, index) in formattedMessages"
          :key="index"
          :class="[
            'chat-message',
            message.from === currentUser.name ? 'me' : message.from === 'system' ? 'system' : 'other'
          ]"
          :style="{ 'justify-content': message.from === 'me' ? 'flex-end' : 'flex-start' }"
          :ref="(el) => { if (index === 0) firstMessage[0] = el as HTMLElement }"
        >
          <!-- Date Divider -->
          <div v-if="shouldShowDateDivider(index)" class="date-divider">
            <span>{{ formatDate(message.timestamp) }}</span>
            <hr />
          </div>

          <div class="message-header">
            <span class="sender">{{ message.from === currentUser.name ? 'You' : message.from === 'system' ? 'System' : message.from }}</span>
            <span class="time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="bubble">
            <div v-html="message.text"></div>
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div class="typing-indicator-container">
        <div v-if="isTyping" class="typing-indicator q-px-md" @click="toggleTypingExpansion">
          <template v-if="isTypingExpanded">
            <span>{{ text }}</span>
          </template>
          <template v-else>
            <span>{{ currentUser.name }} is typing...</span>
          </template>
        </div>
      </div>

      <!-- Chat input -->
      <div class="chat-input-bar">
        <q-input
          rounded
          standout="true"
          v-model="text"
          class="sf-pro-500"
          bg-color="grey-9"
          text-color="grey-5"
          dense
          @keyup.enter="sendMessage"
        >
          <template v-slot:append>
            <q-btn flat round dense icon="arrow_upward" color="dark" @click="handleInput" />
          </template>
        </q-input>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
  import MainContent from '../utils/MainContentLogic'
  export default MainContent
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
  color: grey; /* Grey font for the date */
}

.date-divider hr {
  position: absolute;
  width: 100%;
  top: 50%;
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.5); /* Slightly transparent grey line */
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
  height: 24px; /* Adjust this value based on your design needs */
  margin-bottom: 8px; /* Add some space between the typing indicator and the input */
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

