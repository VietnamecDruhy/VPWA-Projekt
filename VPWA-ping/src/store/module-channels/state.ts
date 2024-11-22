// src/store/module-channels/state.ts
import { SerializedMessage } from 'src/contracts'

export interface ChannelsStateInterface {
  loading: boolean,
  error: Error | null,
  messages: { [channel: string]: SerializedMessage[] },
  active: string | null,
  isPrivate: boolean
}

function state(): ChannelsStateInterface {
  return {
    loading: false,
    error: null,
    messages: {},
    active: null,
    isPrivate: false
  }
}

export default state
