// app/Repositories/MessageRepository.ts
import type { MessageRepositoryContract, SerializedMessage } from '@ioc:Repositories/MessageRepository'
import Channel from 'App/Models/Channel'

export default class MessageRepository implements MessageRepositoryContract {
    public async getAll(
        channelName: string,
        messageId?: string
    ): Promise<SerializedMessage[]> {
        const channel = await Channel.query()
            .where('name', channelName)
            .preload('messages', (messagesQuery) => {
                messagesQuery
                    .orderBy('id', 'desc')
                    .limit(30)
                    .preload('author')

                if (messageId) {
                    const id = parseInt(messageId)
                    messagesQuery
                        .where('id', '<', id)
                        .andWhere('id', '>', id - 31)
                }
            })
            .firstOrFail()

        // Since we ordered by desc, we need to reverse to show oldest first in chat
        return channel.messages.reverse().map((message) => {
            const serialized = message.serialize();
            return {
                id: serialized.id,
                content: serialized.content,
                channelId: serialized.channel_id,
                userId: serialized.user_id,
                createdAt: serialized.created_at,
                updatedAt: serialized.updated_at,
                author: {
                    id: serialized.author.id,
                    email: serialized.author.email,
                    nickname: serialized.author.nickname,
                    createdAt: serialized.author.created_at,
                    updatedAt: serialized.author.updated_at
                }
            } as SerializedMessage;
        });
    }

    public async create(channelName: string, userId: number, content: string): Promise<SerializedMessage> {
        const channel = await Channel.findByOrFail('name', channelName)
        const message = await channel.related('messages').create({ userId, content })
        await message.load('author')

        const serialized = message.serialize();
        return {
            id: serialized.id,
            content: serialized.content,
            channelId: serialized.channel_id,
            userId: serialized.user_id,
            createdAt: serialized.created_at,
            updatedAt: serialized.updated_at,
            author: {
                id: serialized.author.id,
                email: serialized.author.email,
                nickname: serialized.author.nickname,
                createdAt: serialized.author.created_at,
                updatedAt: serialized.author.updated_at
            }
        } as SerializedMessage;
    }

}
