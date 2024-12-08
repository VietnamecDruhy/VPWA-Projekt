// src/store/module-channels/mutations.ts
import { MutationTree } from 'vuex'
import { ChannelsStateInterface } from './state'
import { User, SerializedMessage } from 'src/contracts'


const mutation: MutationTree<ChannelsStateInterface> = {
  LOADING_START(state) {
    state.loading = true
    state.error = null
  },

  LOADING_SUCCESS(state, { channel, messages, isPrivate }: {
    channel: string,
    messages: SerializedMessage[],
    isPrivate?: boolean
  }) {
    state.loading = false;

    // Initialize messages array if it doesn't exist
    if (!state.messages[channel]) {
      state.messages[channel] = messages;
      console.log('no herer')
    } else {
      state.messages[channel] = [...messages, ...state.messages[channel]];
      console.log('yes herer', state.messages[channel])
    }

    // Initialize members array if it doesn't exist
    if (!state.members[channel]) {
      state.members[channel] = [];
    }

    // Set privacy status if provided
    if (typeof isPrivate !== 'undefined') {
      if (!state.isPrivate) {
        state.isPrivate = {};
      }
      state.isPrivate[channel] = isPrivate;
    }

    // Initialize typing users if needed
    if (!state.typingUsers[channel]) {
      state.typingUsers[channel] = {};
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
    state.pendingNotification = {
      channel,
      message
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
  },

  ADD_CHANNEL_MEMBER(state, { channelName, username }) {
    if (state.members && state.members[channelName]) {
      const newUser: User = {
        id: -1,  // Will be updated on next refresh
        nickname: username,
        email: '', // Will be updated on next refresh
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.members[channelName].push(newUser);
    }
  },

  RESET_STATE(state) {
    state.loading = false;
    state.error = null;
    state.messages = {};
    state.active = null;
    state.isPrivate = {};
    state.members = {};
    state.typingUsers = {};
    state.pendingNotification = null;
  },

  SOCKET_ERROR(state, { message, type }: { message: string; type: string }) {
    state.socketError = {
      message,
      type
    };
  },

  CLEAR_SOCKET_ERROR(state) {
    state.socketError = null;
  }
}

export default mutation
