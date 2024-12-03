// src/store/module-activity/getters.ts
import { GetterTree } from 'vuex'
import { StateInterface } from '../index'
import { ActivityStateInterface, OnlineUser } from './state'

const getters: GetterTree<ActivityStateInterface, StateInterface> = {
    allOnlineUsers: (state): OnlineUser[] => {
        return Object.values(state.onlineUsers)
    },

    visibleUsers: (state): OnlineUser[] => {
        return Object.values(state.onlineUsers).filter(user => user.state !== 'dnd')
    },

    getUserState: (state) => (userId: number): string => {
        return state.onlineUsers[userId]?.state || 'offline'
    }
}

export default getters