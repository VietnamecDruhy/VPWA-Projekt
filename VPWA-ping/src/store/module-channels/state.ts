// src/store/module-channels/state.ts
import { SerializedMessage } from 'src/contracts'
import { User } from 'src/contracts'


export interface ChannelsStateInterface {
  loading: boolean,
  error: Error | null,
  messages: { [channel: string]: SerializedMessage[] },
  active: string | null,
  isPrivate: { [channel: string]: boolean },
  members: { [channel: string]: User[] },  // Add members property
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
    members: {},  // Initialize members object
    typingUsers: {}
  }
}

export default state
