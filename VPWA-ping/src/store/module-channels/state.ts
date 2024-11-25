// src/store/module-channels/state.ts
import { SerializedMessage } from 'src/contracts'

export interface ChannelsStateInterface {
  loading: boolean,
  error: Error | null,
  messages: { [channel: string]: SerializedMessage[] },
  active: string | null,
  isPrivate: { [channel: string]: boolean },
  typingUsers: {
    [channel: string]: {
      [userId: string]: {
        user: any,
        timestamp: number
      }
    }
  }
}

function state(): ChannelsStateInterface {
  return {
    loading: false,
    error: null,
    messages: {},
    active: null,
    isPrivate: {},
    typingUsers: {}
  }
}

export default state
