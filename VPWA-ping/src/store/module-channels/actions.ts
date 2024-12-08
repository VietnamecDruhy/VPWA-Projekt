// src/store/module-channels/actions.ts
import { ActionTree } from 'vuex'
import { StateInterface } from '../index'
import { ChannelsStateInterface } from './state'
import { channelService } from 'src/services'
import { RawMessage } from 'src/contracts'

interface JoinChannelParams {
  channel: string;
  isPrivate: boolean;
}

const actions: ActionTree<ChannelsStateInterface, StateInterface> = {
  async join({ commit }, params: string | JoinChannelParams) {
    try {
      commit('LOADING_START')
      const channelName = typeof params === 'string' ? params : params.channel
      const isPrivate = typeof params !== 'string' ? params.isPrivate : undefined

      const channelManager = await channelService.join(channelName)
      try {
        await channelManager.loadMessages(undefined, isPrivate)
      } catch (error) {
        // Clean up socket connection if message loading fails
        channelService.closeConnection(channelName)
        throw error
      }
    } catch (err) {
      commit('LOADING_ERROR', err)
      throw err
    }
  },

  async addMessage({ commit }, { channel, message }: { channel: string, message: RawMessage }) {
    const newMessage = await channelService.in(channel)?.addMessage(message)
    commit('NEW_MESSAGE', { channel, message: newMessage })
  },

  async loadMoreMessages({ commit }, { channel, timestamp, messageId }) {
    try {
      commit('LOADING_START')
      const messages = await channelService.in(channel)?.loadMoreMessages(messageId)
      commit('LOADING_SUCCESS', { channel, messages })
    } catch (err) {
      commit('LOADING_ERROR', err)
      throw err
    }
  },

  async listMembers({ commit }, channel: string) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      const members = await channelManager.listMembers();
      commit('SET_CHANNEL_MEMBERS', { channel, members });
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  },

  async leaveChannel({ commit }, channel: string) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      await channelManager.leaveChannel();
      channelService.closeConnection(channel);
      commit('CLEAR_CHANNEL', channel);
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  },

  async deleteChannel({ commit }, channel: string) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      await channelManager.deleteChannel();
      channelService.closeConnection(channel);
      commit('CLEAR_CHANNEL', channel);
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  },

  async revokeUser({ commit }, { channel, username }: { channel: string; username: string }) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      await channelManager.revokeUser(username);
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  },

  async inviteUser({ commit }, { channel, username }: { channel: string; username: string }) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      await channelManager.inviteUser(username);
      commit('ADD_SYSTEM_MESSAGE', {
        channel,
        content: `Invited user ${username} to the channel`
      });
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  },

  async kickUser({ commit }, { channel, username }: { channel: string; username: string }) {
    try {
      const channelManager = channelService.in(channel);
      if (!channelManager) {
        throw new Error('Channel not found');
      }
      await channelManager.kickUser(username);
    } catch (error) {
      commit('LOADING_ERROR', error);
      throw error;
    }
  }
}

export default actions
