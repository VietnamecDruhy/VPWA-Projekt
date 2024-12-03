// src/store/module-activity/mutations.ts
import { MutationTree } from 'vuex'
import { ActivityStateInterface, OnlineUser } from './state'
import { User } from 'src/contracts'

const mutation: MutationTree<ActivityStateInterface> = {
    SET_ONLINE_USERS(state, users: User[]) {
        const newUsers: { [key: number]: OnlineUser } = {}
        users.forEach(user => {
            newUsers[user.id] = { ...user, state: 'online' }
        })
        state.onlineUsers = newUsers
    },

    ADD_ONLINE_USER(state, user: User) {
        state.onlineUsers[user.id] = { ...user, state: 'online' }
    },

    REMOVE_ONLINE_USER(state, user: User) {
        delete state.onlineUsers[user.id]
    },

    UPDATE_USER_STATE(state, { userId, newState }: { userId: number, newState: 'online' | 'offline' | 'dnd' }) {
        if (state.onlineUsers[userId]) {
            state.onlineUsers[userId].state = newState
        }
    }
}

export default mutation