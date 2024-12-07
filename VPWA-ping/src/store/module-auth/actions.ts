// src/store/module-auth/actions.ts
import { ActionTree } from 'vuex'
import { StateInterface } from '../index'
import { AuthStateInterface } from './state'
import { authService, authManager } from 'src/services'
import { LoginCredentials, RegisterData } from 'src/contracts'
// import { resetStore } from '../index'

const actions: ActionTree<AuthStateInterface, StateInterface> = {
  async check({ commit }) {
    try {
      commit('AUTH_START')
      const user = await authService.me()
      commit('AUTH_SUCCESS', user)
      return user !== null
    } catch (err) {
      commit('AUTH_ERROR', err)
      throw err
    }
  },

  async register({ commit }, form: RegisterData) {
    try {
      commit('AUTH_START')
      const user = await authService.register(form)
      commit('AUTH_SUCCESS', null)
      return user
    } catch (err) {
      commit('AUTH_ERROR', err)
      throw err
    }
  },

  async login({ commit }, credentials: LoginCredentials) {
    try {
      commit('AUTH_START')
      const apiToken = await authService.login(credentials)
      authManager.setToken(apiToken.token)
      commit('AUTH_SUCCESS', null)
      // Set flag for fresh login
      localStorage.setItem('fresh_login', 'true')
      return apiToken
    } catch (err) {
      commit('AUTH_ERROR', err)
      throw err
    }
  },

  async logout({ commit, state, rootState, dispatch }) {
    try {
      console.log('=== CHANNELS STATE DURING LOGOUT ===');

      commit('AUTH_START');
      await authService.logout();

      // Reset auth token
      authManager.removeToken();

      // Explicitly clear channel state before store reset
      commit('channels/RESET_STATE', null, { root: true });

      // Create a fresh store instance
      // const newStore = resetStore();

      return true;
    } catch (err) {
      console.error('Logout error:', err);
      commit('AUTH_ERROR', err);
      throw err;
    }
  }
}

export default actions