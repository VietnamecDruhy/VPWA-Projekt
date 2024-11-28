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
      const messages = await channelManager.loadMessages(undefined, isPrivate)

      commit('LOADING_SUCCESS', { channel: channelName, messages, isPrivate })
      console.log('Joined channel:', channelName)
    } catch (err) {
      commit('LOADING_ERROR', err)
      throw err
    }
  },
  async leave({ getters, commit }, channel: string | null) {
    const leaving: string[] = channel !== null ? [channel] : getters.joinedChannels

    leaving.forEach((c) => {
      channelService.leave(c)
      commit('CLEAR_CHANNEL', c)
    })
  },
  async addMessage({ commit }, { channel, message }: { channel: string, message: RawMessage }) {
    const newMessage = await channelService.in(channel)?.addMessage(message)
    commit('NEW_MESSAGE', { channel, message: newMessage })
  },
  async loadMoreMessages({ commit }, { channel, timestamp, messageId }) {
    try {
      commit('LOADING_START')
      const messages = await channelService.in(channel)?.loadMessages(messageId)
      commit('LOADING_SUCCESS', { channel, messages })
    } catch (err) {
      commit('LOADING_ERROR', err)
      throw err
    }
  }
}

export default actions
