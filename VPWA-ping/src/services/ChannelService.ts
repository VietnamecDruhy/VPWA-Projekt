// src/services/ChannelService.ts
import { RawMessage, SerializedMessage } from 'src/contracts'
import { BootParams, SocketManager } from './SocketManager'

interface ChannelUser {
  id: number;
  nickname: string;
  email: string;
}
// creating instance of this class automatically connects to given socket.io namespace
// subscribe is called with boot params, so you can use it to dispatch actions for socket events
// you have access to socket.io socket using this.socket
class ChannelSocketManager extends SocketManager {
    public subscribe({ store }: BootParams): void {
        const channel = this.namespace.split('/').pop() as string

        this.socket.on('loadMessages:error', (error) => {
          console.error('Socket loadMessages error:', error);
        });

        this.socket.on('message', (message: SerializedMessage) => {
            store.commit('channels/NEW_MESSAGE', { channel, message })
        })

        this.socket.on('loadChannels:response', (channels) => {
            store.commit('channels/SET_JOINED_CHANNELS', channels)
        })

        this.socket.on('typing:start', (user) => {
            console.log('Channel Socket: ', user)

            store.commit('channels/SET_TYPING', {
                channel,
                user: user,
                isTyping: true
            })
        })

        this.socket.on('typing:stop', (user) => {
            store.commit('channels/SET_TYPING', { channel, user, isTyping: false })
        })

        this.socket.on('channelMembers', (members: ChannelUser[]) => {
          store.commit('channels/SET_CHANNEL_MEMBERS', { channel, members })
        })

      this.socket.on('channelDeleted', (channelName: string) => {
        store.commit('channels/CLEAR_CHANNEL', channelName)
        // Ensure we clean up the channel in the service
        const service = (this.constructor as any).getService()
        if (service) {
          service.closeConnection(channelName)
        }
      })

      this.socket.on('leftChannel', (channelName: string) => {
        store.commit('channels/CLEAR_CHANNEL', channelName)
        // Ensure we clean up the channel in the service
        const service = (this.constructor as any).getService()
        if (service) {
          service.closeConnection(channelName)
        }
      })

        this.socket.on('userRevoked', (data: { channelName: string; username: string }) => {
          store.commit('channels/REMOVE_CHANNEL_MEMBER', data)
        })
    }

    public listMembers(): Promise<ChannelUser[]> {
      return this.emitAsync('listMembers')
    }

  public async leaveChannel(): Promise<void> {
    try {
      await this.emitAsync('leaveChannel')
      // Socket cleanup will be handled by the channelDeleted/leftChannel events
    } catch (error) {
      console.error('Error leaving channel:', error)
      throw error
    }
  }

  public async deleteChannel(): Promise<void> {
    try {
      await this.emitAsync('deleteChannel')
      // Socket cleanup will be handled by the channelDeleted event
    } catch (error) {
      console.error('Error deleting channel:', error)
      throw error
    }
  }


  public revokeUser(username: string): Promise<void> {
      return this.emitAsync('revokeUser', username)
    }

    public emitTyping(isTyping: boolean, content?: string): void {
        console.log('Channel Service: ', content)
        this.socket.emit(isTyping ? 'typing:start' : 'typing:stop', { content })
    }

    public addMessage(message: RawMessage): Promise<SerializedMessage> {
        return this.emitAsync('addMessage', message)
    }

    public loadMessages(messageId?: string, isPrivate?: boolean): Promise<SerializedMessage[]> {
      return this.emitAsync('loadMessages', { messageId, isPrivate })
    }

    public loadChannels(): Promise<void> {
        return this.emitAsync('loadChannels')
    }
}

class ChannelService {
    private channels: Map<string, ChannelSocketManager> = new Map()
    private rootChannel: ChannelSocketManager

    constructor() {
        this.rootChannel = new ChannelSocketManager('/')
    }

    public loadChannels(): Promise<void> {
        return this.rootChannel.loadChannels()
    }

    public join(name: string): ChannelSocketManager {
      this.closeConnection(name)

      const channel = new ChannelSocketManager(`/channels/${name}`);
      this.channels.set(name, channel);
      return channel;
    }

  public closeConnection(name: string): void {
    const channel = this.channels.get(name)
    if (channel) {
      // Disconnect namespace and remove references to socket
      channel.destroy()
      this.channels.delete(name)
    }
  }

  public leave(name: string): boolean {
    const channel = this.channels.get(name)
    if (!channel) {
      return false
    }
    // Disconnect namespace and remove references to socket
    channel.destroy()
    this.channels.delete(name)
    return true
  }

    public in(name: string): ChannelSocketManager | undefined {
        return this.channels.get(name)
    }
}

export default new ChannelService()
