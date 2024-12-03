// src/store/index.ts
import { store } from 'quasar/wrappers'
import { InjectionKey } from 'vue'
import { Router } from 'vue-router'
import {
  createStore,
  Store as VuexStore,
  useStore as vuexUseStore,
} from 'vuex'
import type { AuthStateInterface } from './module-auth/state'
import type { ChannelsStateInterface } from './module-channels/state'
import type { ActivityStateInterface } from './module-activity/state'
import auth from './module-auth'
import channels from './module-channels'
import activity from './module-activity'

export interface StateInterface {
  auth: AuthStateInterface
  channels: ChannelsStateInterface
  activity: ActivityStateInterface
}

// provide typings for `this.$store`
declare module 'vue' {
  interface ComponentCustomProperties {
    $store: VuexStore<StateInterface>
  }
}

// provide typings for `useStore` helper
export const storeKey: InjectionKey<VuexStore<StateInterface>> = Symbol('vuex-key')

// Provide typings for `this.$router` inside Vuex stores
declare module 'vuex' {
  export interface Store<S> {
    readonly $router: Router;
  }
}

export default store(function (/* { ssrContext } */) {
  const Store = createStore<StateInterface>({
    modules: {
      auth,
      channels,
      activity
    },

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: !!process.env.DEBUGGING
  })

  return Store;
})

export function useStore() {
  return vuexUseStore(storeKey)
}