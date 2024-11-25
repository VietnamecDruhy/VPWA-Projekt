// src/store/module-channels/mutations.ts
import { SerializedMessage } from 'src/contracts'
import { MutationTree } from 'vuex'
import { ChannelsStateInterface } from './state'

const mutation: MutationTree<ChannelsStateInterface> = {
  LOADING_START(state) {
    state.loading = true
    state.error = null
  },
  LOADING_SUCCESS(state, { channel, messages }: { channel: string, messages: SerializedMessage[] }) {
    state.loading = false
    // Initialize messages array if it doesn't exist
    if (!state.messages[channel]) {
      state.messages[channel] = messages
    } else {
      state.messages[channel] = [...messages, ...state.messages[channel]]
      // console.log('Mutations: ', state.messages[channel])
    }
  },
  LOADING_ERROR(state, error) {
    state.loading = false
    state.error = error
  },
  CLEAR_CHANNEL(state, channel) {
    state.active = null
    delete state.messages[channel]
  },
  SET_ACTIVE(state, channel: string) {
    state.active = channel
  },

  SET_JOINED_CHANNELS(state, channels: { id: number, name: string, isPrivate: boolean }[]) {
    channels.forEach(channel => {
      // Initialize messages array if it doesn't exist
      if (!state.messages[channel.name]) {
        state.messages[channel.name] = [];
      }

      // Set the isPrivate status for each channel
      if (!state.isPrivate) {
        state.isPrivate = {};
      }
      state.isPrivate[channel.name] = channel.isPrivate;
    });
  },
  NEW_MESSAGE(state, { channel, message }: { channel: string, message: SerializedMessage }) {
    state.messages[channel].push(message)
  },

  SET_TYPING(state, { channel, user, isTyping }) {
    if (!state.typingUsers[channel]) {
      state.typingUsers[channel] = {}
    }

    if (isTyping) {
      state.typingUsers[channel][user.id] = {
        user,
        timestamp: Date.now()
      }
    } else {
      delete state.typingUsers[channel][user.id]
    }
  }
}

export default mutation