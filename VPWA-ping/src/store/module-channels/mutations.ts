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
    }
  },
  LOADING_ERROR(state, error) {
    state.loading = false
    state.error = error
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

    if (channel !== state.active) {
      state.pendingNotification = {
        channel,
        message
      }
    }
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
  },
  SET_CHANNEL_MEMBERS(state, { channel, members }) {
    if (!state.members) {
      state.members = {};
    }
    state.members[channel] = members;
  },

  REMOVE_CHANNEL_MEMBER(state, { channelName, username }) {
    if (state.members && state.members[channelName]) {
      state.members[channelName] = state.members[channelName].filter(
        member => member.nickname !== username
      );
    }
  },

  CLEAR_CHANNEL(state, channelName) {
    if (state.active === channelName) {
      state.active = null;
    }
    if (state.messages) {
      delete state.messages[channelName];
    }
    if (state.members) {
      delete state.members[channelName];
    }
  }
}

export default mutation
