// app/Repositories/MessageRepository.ts
import type { MessageRepositoryContract, SerializedMessage } from '@ioc:Repositories/MessageRepository'
import Channel from 'App/Models/Channel'

export default class MessageRepository implements MessageRepositoryContract {
    public async getAll(channelName: string): Promise<SerializedMessage[]> {
        const channel = await Channel.query()
            .where('name', channelName)
            .preload('messages', (messagesQuery) => messagesQuery.preload('author'))
            .firstOrFail()

        return channel.messages.map((message) => {
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
