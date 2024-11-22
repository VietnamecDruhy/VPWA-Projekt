<template>
  <div class="q-pa-md">
    <h5>Channel Test:</h5>

    <!-- Connection Status -->
    <div class="q-mb-md">
      Connection status:
      <q-chip :color="channel ? 'positive' : 'grey'" text-color="white" size="sm">
        {{ channel ? `Connected to ${channelName}` : 'Not connected' }}
      </q-chip>
    </div>

    <!-- Actions -->
    <div class="q-gutter-sm">
      <q-btn label="Join Channel" color="primary" @click="joinChannel" :loading="joiningChannel"
        :disabled="!!channel" />

      <q-btn label="Load Messages" color="secondary" @click="loadChannelMessages" :loading="loading"
        :disabled="!channel" />

      <q-btn v-if="channel" label="Leave Channel" color="negative" @click="leaveChannel" :disabled="loading" />
    </div>

    <!-- Error Display -->
    <q-banner v-if="error" class="bg-negative text-white q-mt-md">
      {{ error }}
      <template v-slot:action>
        <q-btn flat color="white" label="Dismiss" @click="error = ''" />
      </template>
    </q-banner>

    <!-- Messages Section -->
    <div class="q-mt-lg">
      <div v-if="loading" class="text-center">
        <q-spinner-dots color="primary" size="40" />
        <div>Loading messages...</div>
      </div>

      <div v-else>
        <div v-if="messages.length" class="q-gutter-y-md">
          <q-card v-for="message in messages" :key="message.id" flat bordered class="message-card">
            <q-card-section>
              <div class="text-body1">{{ message.content }}</div>
              <div class="text-caption text-grey">
                User ID: {{ message.userId }}
                <q-separator class="q-mx-sm" vertical inset />
                {{ formatDate(message.createdAt) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <q-banner v-else class="text-center bg-grey-2">
          No messages in channel
        </q-banner>
      </div>
    </div>

    <!-- Send Message Section -->
    <div v-if="channel" class="q-mt-md">
      <q-input v-model="newMessage" label="New Message" outlined dense @keyup.enter="sendMessage">
        <template v-slot:after>
          <q-btn round dense flat icon="send" @click="sendMessage" :disabled="!newMessage.trim()" />
        </template>
      </q-input>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, onMounted } from 'vue'
import ChannelService from 'src/services/ChannelService'
import { SerializedMessage } from 'src/contracts'
import { useStore } from 'src/store';


export default defineComponent({
  name: 'TestPage',

  setup() {
    const channelName = 'general'
    const channel = ref(ChannelService.in(channelName))
    const error = ref('')
    const messages = ref<SerializedMessage[]>([])
    const loading = ref(false)
    const joiningChannel = ref(false)
    const newMessage = ref('')

    const store = useStore();


    onMounted(() => {
      console.log('Hello')
      console.log('Store Getters:', store.getters)
    })

    // Cleanup on component unmount
    onUnmounted(() => {
      if (channel.value) {
        ChannelService.leave(channelName)
      }
    })

    const joinChannel = async () => {
      joiningChannel.value = true
      error.value = ''

      try {
        channel.value = ChannelService.join(channelName)

        // Subscribe to new messages
        channel.value.socket.on('message', (message: SerializedMessage) => {
          messages.value.push(message)
        })

        // Load initial messages after joining
        await loadChannelMessages()
      } catch (err) {
        console.error('Error joining channel:', err)
        error.value = err instanceof Error ? err.message : 'Failed to join channel'
      } finally {
        joiningChannel.value = false
      }
    }

    const leaveChannel = () => {
      try {
        if (channel.value) {
          ChannelService.leave(channelName)
          channel.value = undefined
          messages.value = []
          error.value = ''
        }
      } catch (err) {
        console.error('Error leaving channel:', err)
        error.value = err instanceof Error ? err.message : 'Failed to leave channel'
      }
    }

    const loadChannelMessages = async () => {
      if (!channel.value) {
        error.value = 'No channel connection'
        return
      }

      loading.value = true
      error.value = ''

      try {
        const loadedMessages = await channel.value.loadMessages()
        messages.value = loadedMessages
      } catch (err) {
        console.error('Error loading messages:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load messages'
      } finally {
        loading.value = false
      }
    }

    const sendMessage = async () => {
      if (!channel.value || !newMessage.value.trim()) return

      try {
        const message = await channel.value.addMessage(newMessage.value)
        messages.value.push(message)
        newMessage.value = '' // Clear input after sending
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to send message'
      }
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString()
    }

    return {
      channel,
      channelName,
      joinChannel,
      leaveChannel,
      loadChannelMessages,
      sendMessage,
      error,
      messages,
      loading,
      joiningChannel,
      newMessage,
      formatDate
    }
  }
})
</script>

<style scoped>
.message-card {
  transition: all 0.2s ease-in-out;
}

.message-card:hover {
  transform: translateX(4px);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
}
</style>