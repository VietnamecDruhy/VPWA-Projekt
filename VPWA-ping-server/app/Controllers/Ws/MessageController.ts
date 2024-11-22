// app/Controllers/Ws/MessageController.ts
import type { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import type { MessageRepositoryContract } from '@ioc:Repositories/MessageRepository'
import { inject } from '@adonisjs/core/build/standalone'
import User from "App/Models/User";

// inject repository from container to controller constructor
// we do so because we can extract database specific storage to another class
// and also to prevent big controller methods doing everything
// controler method just gets data (validates it) and calls repository
// also we can then test standalone repository without controller
// implementation is bind into container inside providers/AppProvider.ts
@inject(['Repositories/MessageRepository'])
export default class MessageController {
    constructor(private messageRepository: MessageRepositoryContract) { }

    public async loadMessages({ params, socket }: WsContextContract) {
        try {
            const messages = await this.messageRepository.getAll(params.name)
            socket.emit('loadMessages:response', messages)
        } catch (error) {
            console.error('Error loading messages:', error)
            socket.emit('loadMessages:error', error)
        }
    }

    public async addMessage({ params, socket, auth }: WsContextContract, content: string) {
        const message = await this.messageRepository.create(params.name, auth.user!.id, content)
        // broadcast message to other users in channel
        socket.broadcast.emit('message', message)
        // return message to sender
        socket.emit('message', message)
    }

    // channel 
    public async loadChannels({ socket, auth }: WsContextContract) {
        try {
            // Get the authenticated user and load their channels
            const user = await User.query()
                .where('id', auth.user!.id)
                .preload('channels', (query) => {
                    query.select(['id', 'name', 'is_private']);
                })
                .firstOrFail();

            console.log(user.$preloaded.channels);

            // Extract channels and send them back
            const channels = user.channels.map(channel => ({
                id: channel.id,
                name: channel.name,
                isPrivate: channel.isPrivate
            }))

            socket.emit('loadChannels:response', channels)
        } catch (error) {
            console.error('Error loading channels:', error)
            socket.emit('loadChannels:error', error)
        }
    }
}
