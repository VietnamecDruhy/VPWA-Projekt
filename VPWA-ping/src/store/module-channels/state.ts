// src/store/module-channels/state.ts
import { SerializedMessage } from 'src/contracts'
import { User } from 'src/contracts'

export interface ChannelsStateInterface {
  loading: boolean,
  error: Error | null,
  messages: { [channel: string]: SerializedMessage[] },
  active: string | null,
  isPrivate: { [channel: string]: boolean },
  members: { [channel: string]: User[] },
  typingUsers: {
    [channel: string]: {
      [userId: string]: {
        user: any,
        timestamp: number
      }
    }
  },
  pendingNotification: {
    channel: string,
    message: SerializedMessage
  } | null,
  socketError: {
    message: string;
    type: string;
  } | null;
}

function state(): ChannelsStateInterface {
  return {
    loading: false,
    error: null,
    messages: {},
    active: null,
    isPrivate: {},
    members: {},  // Initialize members object
    typingUsers: {},
    pendingNotification: null,
    socketError: null
  }
}

export default state
