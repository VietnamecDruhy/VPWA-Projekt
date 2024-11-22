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
    state.messages[channel] = messages
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
    // Initialize message arrays for each channel
    channels.forEach(channel => {
      if (!state.messages[channel.name]) {
        state.messages[channel.name] = []
      }
    })
  },

  NEW_MESSAGE(state, { channel, message }: { channel: string, message: SerializedMessage }) {
    state.messages[channel].push(message)
  }
}

export default mutation