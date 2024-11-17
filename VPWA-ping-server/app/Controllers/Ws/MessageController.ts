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

    public async loadMessages({ params }: WsContextContract) {
        return this.messageRepository.getAll(params.name)
    }

    public async addMessage({ params, socket, auth }: WsContextContract, content: string) {
        const message = await this.messageRepository.create(params.name, auth.user!.id, content)
        // broadcast message to other users in channel
        socket.broadcast.emit('message', message)
        // return message to sender
        return message
    }

    public async getUserChannels(userId: number) {
        const user = await User.find(userId);
        if (!user) {
            throw new Error('User not found');
        }

        await user.load('channels', (query) => {
            query.select(['id', 'name', 'owner_id', 'isPrivate'])
                .withCount('messages')
                .preload('messages', (messagesQuery) => {
                    messagesQuery.orderBy('created_at', 'desc').limit(1);
                });
        });

        return user.channels.map(channel => ({
            id: channel.id,
            name: channel.name,
            ownerId: channel.owner_id,
            isPrivate: channel.isPrivate,
            messageCount: channel.$extras.messages_count,
            lastMessage: channel.messages[0] || null
        }));
    }
}
