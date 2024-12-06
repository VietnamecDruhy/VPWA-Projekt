// src/store/module-channels/mutations.ts
import { MutationTree } from 'vuex'
import { ChannelsStateInterface } from './state'
import { StateInterface } from '../index'
import { Store } from 'vuex'
import { User, SerializedMessage } from 'src/contracts'


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
  },

  ADD_CHANNEL_MEMBER(state, { channelName, username }) {
    // Implementation depends on how you store channel members in your state
    console.log(`User ${username} was added to channel ${channelName}`)
  },

  HANDLE_USER_KICKED(state: ChannelsStateInterface, { channelName, username, kickedUserId }: { channelName: string, username: string, kickedUserId: number }, store?: Store<StateInterface>) {
    const currentUser = store?.state.auth.user;

    // Remove the channel if the current user is the one being kicked
    if (currentUser && currentUser.id === kickedUserId) {
      // Remove the channel from messages
      if (state.messages[channelName]) {
        delete state.messages[channelName];
      }

      // Remove from members
      if (state.members[channelName]) {
        delete state.members[channelName];
      }

      // Clear active channel if it's the current one
      if (state.active === channelName) {
        state.active = null;
      }
    } else {
      // If another user was kicked, just update the members list
      if (state.members[channelName]) {
        state.members[channelName] = state.members[channelName].filter(
          member => member.nickname !== username
        );
      }
    }

    // Add kick message directly to state
    if (state.messages[channelName]) {
      const systemUser: User = {
        id: -1,
        nickname: 'system',
        email: 'system@system.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const message: SerializedMessage = {
        id: Date.now(),
        content: currentUser && currentUser.id === kickedUserId
          ? `You have been kicked from ${channelName}`
          : `${username} has been kicked from the channel`,
        channelId: parseInt(channelName, 10) || -1,
        userId: -1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: systemUser
      };

      state.messages[channelName].push(message);
    }
  },

  UPDATE_USER_KICKS(state: ChannelsStateInterface, { channelName, username, kicks }: { channelName: string, username: string, kicks: number }) {
    if (state.messages[channelName]) {
      const votesNeeded = 3 - kicks;

      const systemUser: User = {
        id: -1,
        nickname: 'system',
        email: 'system@system.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const message: SerializedMessage = {
        id: Date.now(),
        content: `${username} received a kick vote (${votesNeeded} more needed for kick)`,
        channelId: parseInt(channelName, 10) || -1,
        userId: -1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: systemUser
      };

      state.messages[channelName].push(message);
    }
  }
}

export default mutation
