// src/store/module-channels/state.ts
import { SerializedMessage } from 'src/contracts'

// Define the channel user interface
interface ChannelUser {
  id: number;
  nickname: string;
  email: string;
}

export interface ChannelsStateInterface {
  loading: boolean,
  error: Error | null,
  messages: { [channel: string]: SerializedMessage[] },
  active: string | null,
  isPrivate: { [channel: string]: boolean },
  members: { [channel: string]: ChannelUser[] },  // Add members property
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
