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

  public async loadMessages(
    { params, socket, auth }: WsContextContract,
    { messageId, isPrivate }: { messageId?: string; isPrivate?: boolean } = {}
  ) {
    try {
      const name = params.name.split('/').pop();
      let channel = await Channel.query().where('name', name).preload('users').first();

      if (!channel) {
        if (isPrivate === undefined) {
          throw new Error('Channel does not exist');
        }
        // Create a new channel if it doesn't exist and assign `isPrivate`
        channel = await Channel.create({
          name,
          ownerId: auth.user!.id,
          isPrivate,
        });

        // Add the creator as the initial member of the channel
        await Database.table('channel_users').insert({
          channel_id: channel.id,
          user_id: auth.user!.id,
          created_at: new Date(Date.now()),
          updated_at: new Date(Date.now()),
        });

        socket.join(name);
        socket.emit('loadMessages:response', []);
        return;
      }

      // Ensure that private channel access is restricted to members
      if (channel.isPrivate) {
        const userIsInChannel = await Database.from('channel_users')
          .where('channel_id', channel.id)
          .andWhere('user_id', auth.user!.id)
          .first();

        if (!userIsInChannel) {
          throw new Error('Cannot join private channel without invitation');
        }
      }

      // Add the user to the channel if they are not already in it
      const userIsInChannel = await Database.from('channel_users')
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

      // Fetch messages and join the socket room
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

  public async listMembers({ params, socket }: WsContextContract) {
    try {
      const channel = await Channel.findByOrFail('name', params.name)

      const channelUsers = await Database
        .from('channel_users')
        .join('users', 'channel_users.user_id', 'users.id')
        .where('channel_users.channel_id', channel.id)
        .select('users.id', 'users.nickname', 'users.email')

      socket.emit('channelMembers', channelUsers)
    } catch (error) {
      console.error('Error listing members:', error)
      socket.emit('error', { message: 'Failed to list members' })
    }
  }

  public async leaveChannel({ params, socket, auth }: WsContextContract) {
    try {
      const channel = await Channel.findByOrFail('name', params.name)
      const userId = auth.user!.id

      // Check if user is in channel
      const membership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userId)
        .first()

      if (!membership) {
        throw new Error('User is not a member of this channel')
      }

      // If user is owner, delete the channel and all relationships
      if (channel.ownerId === userId) {
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .delete()

        await channel.delete()

        // Notify all users in the channel that it's been deleted
        socket.broadcast.to(params.name).emit('channelDeleted', channel.name)
        socket.emit('channelDeleted', channel.name)
      } else {
        // Just remove the user from channel_users
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .where('user_id', userId)
          .delete()

        socket.emit('leftChannel', channel.name)
      }

      // Clean up socket connection
      socket.leave(params.name)
    } catch (error) {
      console.error('Error leaving channel:', error)
      socket.emit('error', { message: error.message || 'Failed to leave channel' })
    }
  }

  public async deleteChannel({ params, socket, auth }: WsContextContract) {
    try {
      const channel = await Channel.findByOrFail('name', params.name)

      // Verify user is the owner
      if (channel.ownerId !== auth.user!.id) {
        throw new Error('Only channel owner can delete the channel')
      }

      // Delete all channel_users entries
      await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .delete()

      // Delete the channel
      await channel.delete()

      // Notify all users in the channel
      socket.broadcast.to(params.name).emit('channelDeleted', channel.name)
      socket.emit('channelDeleted', channel.name)

      // Clean up socket connection
      socket.leave(params.name)
    } catch (error) {
      console.error('Error deleting channel:', error)
      socket.emit('error', { message: error.message || 'Failed to delete channel' })
    }
  }

  public async revokeUser({ params, socket, auth }: WsContextContract, username: string) {
    try {
      const channel = await Channel.findByOrFail('name', params.name)

      // Verify user is the owner
      if (channel.ownerId !== auth.user!.id) {
        throw new Error('Only channel owner can revoke users')
      }

      // Find user to revoke
      const userToRevoke = await User.findByOrFail('nickname', username)

      // Check if user is in channel
      const membership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToRevoke.id)
        .first()

      if (!membership) {
        throw new Error('User is not a member of this channel')
      }

      // Remove user from channel
      await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToRevoke.id)
        .delete()

      // Notify all users in the channel
      socket.broadcast.to(params.name).emit('userRevoked', {
        channelName: channel.name,
        username: userToRevoke.nickname
      })
      socket.emit('userRevoked', {
        channelName: channel.name,
        username: userToRevoke.nickname
      })
    } catch (error) {
      console.error('Error revoking user:', error)
      socket.emit('error', { message: error.message || 'Failed to revoke user' })
    }
  }
  public async kickUser({ params, socket, auth }: WsContextContract, username: string) {
    try {
      const channel = await Channel.findByOrFail('name', params.name);
      const userToKick = await User.findByOrFail('nickname', username);

      // Check if user is in channel
      const membership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToKick.id)
        .first();

      if (!membership) {
        throw new Error('User is not a member of this channel');
      }

      // If requester is owner, kick immediately
      if (channel.ownerId === auth.user!.id) {
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .where('user_id', userToKick.id)
          .delete();  // Remove them from channel_users

        socket.to(params.name).emit('userKicked', {
          channelName: channel.name,
          username: userToKick.nickname,
          byOwner: true,
          kickedUserId: userToKick.id
        });

        socket.emit('userKicked', {
          channelName: channel.name,
          username: userToKick.nickname,
          byOwner: true,
          kickedUserId: userToKick.id
        });

        return;
      }

      // If not owner, increment kick counter
      const updatedKicks = membership.kicks + 1;

      if (updatedKicks >= 3) {
        // If enough kicks, remove from channel
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .where('user_id', userToKick.id)
          .delete();

        socket.to(params.name).emit('userKicked', {
          channelName: channel.name,
          username: userToKick.nickname,
          byVote: true,
          kickedUserId: userToKick.id  // Make sure to include the numeric ID
        });

        socket.emit('userKicked', {
          channelName: channel.name,
          username: userToKick.nickname,
          byVote: true,
          kickedUserId: userToKick.id
        });
      } else {
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .where('user_id', userToKick.id)
          .update({ kicks: updatedKicks });

        socket.to(params.name).emit('userKickVoted', {
          channelName: channel.name,
          username: userToKick.nickname,
          kicks: updatedKicks
        });

        socket.emit('userKickVoted', {
          channelName: channel.name,
          username: userToKick.nickname,
          kicks: updatedKicks
        });
      }
    } catch (error) {
      console.error('Error kicking user:', error);
      socket.emit('error', { message: error.message || 'Failed to kick user' });
    }
  }

  public async inviteUser({ params, socket, auth }: WsContextContract, username: string) {
    try {
      const channel = await Channel.findByOrFail('name', params.name);
      const userToInvite = await User.findByOrFail('nickname', username);

      // Check if user is already in channel
      const existingMembership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToInvite.id)
        .first();

      if (existingMembership) {
        if (existingMembership.is_kicked) {
          // Only owner can reinvite kicked users
          if (channel.ownerId !== auth.user!.id) {
            throw new Error('Only channel owner can invite kicked users');
          }
        } else {
          throw new Error('User is already a member of this channel');
        }
      }

      // For private channels, only owner can invite
      if (channel.isPrivate && channel.ownerId !== auth.user!.id) {
        throw new Error('Only channel owner can invite users to private channels');
      }

      // Add user to channel
      await Database.table('channel_users').insert({
        channel_id: channel.id,
        user_id: userToInvite.id,
        created_at: new Date(),
        updated_at: new Date(),
        kicks: 0,
        is_kicked: false
      });

      socket.broadcast.to(params.name).emit('userInvited', {
        channelName: channel.name,
        username: userToInvite.nickname
      });
    } catch (error) {
      console.error('Error inviting user:', error);
      socket.emit('error', { message: error.message || 'Failed to invite user' });
    }
  }
}
