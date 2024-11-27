// src/services/ChannelService.ts
import { RawMessage, SerializedMessage } from 'src/contracts'
import { BootParams, SocketManager } from './SocketManager'


// creating instance of this class automatically connects to given socket.io namespace
// subscribe is called with boot params, so you can use it to dispatch actions for socket events
// you have access to socket.io socket using this.socket
class ChannelSocketManager extends SocketManager {
    public subscribe({ store }: BootParams): void {
        const channel = this.namespace.split('/').pop() as string

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
    }

    public emitTyping(isTyping: boolean, content?: string): void {
        console.log('Channel Service: ', content)
        this.socket.emit(isTyping ? 'typing:start' : 'typing:stop', { content })
    }

    public addMessage(message: RawMessage): Promise<SerializedMessage> {
        return this.emitAsync('addMessage', message)
    }

    public loadMessages(messageId?: string): Promise<SerializedMessage[]> {
        return this.emitAsync('loadMessages', { messageId })
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
        if (this.channels.has(name)) {
            throw new Error(`User is already joined in channel "${name}"`)
        }

        // connect to given channel namespace
        const channel = new ChannelSocketManager(`/channels/${name}`)
        this.channels.set(name, channel)
        return channel
    }

    public leave(name: string): boolean {
        const channel = this.channels.get(name)

        if (!channel) {
            return false
        }

        // disconnect namespace and remove references to socket
        channel.destroy()
        return this.channels.delete(name)
    }

    public in(name: string): ChannelSocketManager | undefined {
        return this.channels.get(name)
    }
}

export default new ChannelService()
