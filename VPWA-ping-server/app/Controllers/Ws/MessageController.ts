// app/Controllers/Ws/MessageController.ts
import type { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import type { MessageRepositoryContract } from '@ioc:Repositories/MessageRepository'
import { inject } from '@adonisjs/core/build/standalone'
import User from "App/Models/User";
import Channel from "App/Models/Channel";
import Database from '@ioc:Adonis/Lucid/Database';

// inject repository from container to controller constructor
// we do so because we can extract database specific storage to another class
// and also to prevent big controller methods doing everything
// controler method just gets data (validates it) and calls repository
// also we can then test standalone repository without controller
// implementation is bind into container inside providers/AppProvider.ts
@inject(['Repositories/MessageRepository'])
export default class MessageController {
    constructor(private messageRepository: MessageRepositoryContract) { }

  public async loadMessages({ params, socket, auth }: WsContextContract, { messageId, isPrivate }: { messageId?: string, isPrivate?: boolean } = {}) {
    try {
      const name = params.name.split('/').pop();
      let channel = await Channel.query().where('name', name).preload('users').first();

      if (!channel) {
        if (isPrivate === undefined) {
          throw new Error('Channel does not exist');
        }
        channel = await Channel.create({
          name,
          ownerId: auth.user!.id,
          isPrivate: isPrivate,
        });
      } else if (channel.isPrivate && isPrivate === undefined) {
        // If trying to join existing private channel without invitation
        throw new Error('Cannot join private channel without invitation');
      }

      const userIsInChannel = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .andWhere('user_id', auth.user!.id)
        .first();

      if (!userIsInChannel) {
        await Database.table('channel_users').insert({
          channel_id: channel.id,
          user_id: auth.user!.id,
          created_at: new Date(Date.now()),
          updated_at: new Date(Date.now()),
        });
      }

      const messages = await this.messageRepository.getAll(name, messageId);
      socket.join(name);
      socket.emit('loadMessages:response', messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      socket.emit('loadMessages:error', { message: error.message });
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

            // Extract channels and send them back
            const channels = user.channels.map(channel => ({
                id: channel.id,
                name: channel.name,
                isPrivate: channel.isPrivate
            }))

            console.log(channels)

            socket.emit('loadChannels:response', channels)
        } catch (error) {
            console.error('Error loading channels:', error)
            socket.emit('loadChannels:error', error)
        }
    }

    public async handleTypingStart({ socket, auth }: WsContextContract, data: string) {
        console.log(data)
        const user = auth.user!;
        socket.broadcast.emit('typing:start', {
            id: user.id,
            nickname: user.nickname,
            content: data
        });
    }

    public async handleTypingStop({ socket, auth }: WsContextContract) {
        const user = auth.user!;
        socket.broadcast.emit('typing:stop', {
            id: user.id,
            nickname: user.nickname
        });
    }
}
