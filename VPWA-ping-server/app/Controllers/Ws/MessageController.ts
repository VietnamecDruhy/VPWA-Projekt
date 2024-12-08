// app/Controllers/Ws/MessageController.ts
import type { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import type { MessageRepositoryContract } from '@ioc:Repositories/MessageRepository'
import { inject } from '@adonisjs/core/build/standalone'
import User from "App/Models/User";
import Channel from "App/Models/Channel";
import Database from '@ioc:Adonis/Lucid/Database';
import Ws from '@ioc:Ruby184/Socket.IO/Ws';


// inject repository from container to controller constructor
// we do so because we can extract database specific storage to another class
// and also to prevent big controller methods doing everything
// controler method just gets data (validates it) and calls repository
// also we can then test standalone repository without controller
// implementation is bind into container inside providers/AppProvider.ts
@inject(['Repositories/MessageRepository'])
export default class MessageController {
  constructor(private messageRepository: MessageRepositoryContract) { }

  private async createChannel(
    name: string,
    auth: any,
    socket: any,
    isPrivate: boolean
  ) {
    // Create a new channel
    const channel = await Channel.create({
      name,
      ownerId: auth.user!.id,
      isPrivate,
    });

    // Add the creator as the initial member
    await Database.table('channel_users').insert({
      channel_id: channel.id,
      user_id: auth.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Get system user from database
    const systemUser = await Database
      .from('users')
      .where('nickname', 'system')
      .first();

    // Create system welcome message using channel relationship
    const message = await channel.related('messages').create({
      userId: systemUser.id,
      content: isPrivate
        ? `This is your very secret ${name} channel!`
        : `Welcome to ${name} channel!`
    });

    // Load the author relationship
    await message.load('author');

    const serialized = message.serialize();
    const welcomeMessage = {
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
    };

    // Get initial member details
    const initialMember = await Database
      .from('users')
      .where('id', auth.user!.id)
      .select('id', 'nickname', 'email')
      .first();

    console.log('Welcome,', welcomeMessage)
    // Join socket room and emit initial state
    socket.join(name);
    socket.emit('loadMessages:response', {
      messages: [welcomeMessage],
      channelInfo: {
        name: channel.name,
        isPrivate: channel.isPrivate
      }
    });

    socket.emit('channelMembers', [initialMember]);

    return channel;
  }

  private async joinChannel(
    channel: any,
    auth: any,
    socket: any,
    channelName: string
  ): Promise<boolean> {
    // Check if user is banned
    const isBanned = await Database
      .from('banned_users')
      .where('channel_id', channel.id)
      .where('user_id', auth.user!.id)
      .first();

    if (isBanned) {
      socket.emit('error', { message: `You have been banned from "${channelName}"` });
      return false;
    }

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

      socket.broadcast.to(channelName).emit('userJoined', {
        channelName: channel.name,
        username: auth.user!.nickname
      });

      return true;  // User was newly added
    }

    return false;  // User was already in channel
  }

  public async loadMessages(
    { params, socket, auth }: WsContextContract,
    { messageId, isPrivate }: { messageId?: string; isPrivate?: boolean } = {}
  ) {
    try {
      const name = params.name.split('/').pop();
      let channel = await Channel.query().where('name', name).preload('users').first();

      if (!channel) {
        if (isPrivate === undefined) {
          socket.emit('error', { message: 'Channel does not exist' });
          socket.emit('leftChannel', name)
          return;
        }
        channel = await this.createChannel(name, auth, socket, isPrivate ?? false);
        return;
      }

      // Ensure that private channel access is restricted to members
      if (channel.isPrivate) {
        const userIsInChannel = await Database.from('channel_users')
          .where('channel_id', channel.id)
          .andWhere('user_id', auth.user!.id)
          .first();

        if (!userIsInChannel) {
          socket.emit('error', { message: 'Cannot join private channel without invitation' });
          return;
        }
      }

      // Add user to channel if not already a member
      await this.joinChannel(channel, auth, socket, name);

      // Fetch messages
      const messages = await this.messageRepository.getAll(name, messageId);

      // Fetch current channel members
      const channelMembers = await Database
        .from('channel_users')
        .join('users', 'channel_users.user_id', 'users.id')
        .where('channel_users.channel_id', channel.id)
        .select('users.id', 'users.nickname', 'users.email');

      // Join with full namespace
      const roomName = `channels/${name}`;
      await socket.join(roomName);

      // Emit messages with channel info
      socket.emit('loadMessages:response', {
        messages,
        channelInfo: {
          name: channel.name,
          isPrivate: channel.isPrivate
        }
      });

      // Emit channel members
      socket.emit('channelMembers', channelMembers);

    } catch (error) {
      console.error('Error loading messages:', error);
      socket.emit('loadMessages:error', { message: error.message });
    }
  }

  public async addMessage({ params, socket, auth }: WsContextContract, content: string) {

    if (params.name === 'general') {
      socket.emit('error', { message: 'Cannot send messages in the general channel' });
      return;
    }

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
    const roomName = `channels/${params.name}`;

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
        socket.emit('error', { message: 'User is not a member of this channel' });
        return;
      }

      // If user is owner, delete the channel and all relationships
      if (channel.ownerId === userId) {
        await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .delete()

        await channel.delete()

        // Notify all users in the channel that it's been deleted
        socket.to(roomName).emit('channelDeleted', channel.name)
        socket.emit('channelDeleted', channel.name)
      } else {
        const result = await this.revokeUser(channel, auth.user!);

        // Channel-specific broadcasts
        socket.broadcast.emit('userRevoked', result);
        socket.emit('userRevoked', result);

        socket.emit('leftChannel', channel.name)

        const message = await this.messageRepository.create(params.name, -1,
          `${auth.user?.nickname} left channel`);
        socket.broadcast.emit('message', message);
        socket.emit('message', message);
      }

      // Clean up socket connection
      socket.leave(roomName)
    } catch (error) {
      console.error('Error leaving channel:', error)
      socket.emit('error', { message: error.message || 'Failed to leave channel' })
    }
  }

  public async deleteChannel({ params, socket, auth }: WsContextContract) {
    const roomName = `channels/${params.name}`;

    try {
      const channel = await Channel.findByOrFail('name', params.name)

      // Verify user is the owner
      if (channel.ownerId !== auth.user!.id) {
        socket.emit('error', { message: 'Only channel owner can delete the channel' });
        return;
      }

      // Delete all channel_users entries
      await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .delete()

      // Delete the channel
      await channel.delete()

      // Notify all users in the channel
      socket.broadcast.to(roomName).emit('channelDeleted', channel.name)
      socket.emit('channelDeleted', channel.name)

      // Clean up socket connection
      socket.leave(params.name)
    } catch (error) {
      console.error('Error deleting channel:', error)
      socket.emit('error', { message: error.message || 'Failed to delete channel' })
    }
  }

  private async revokeUser(channel: Channel, userToRevoke: User) {
    // Remove user from channel
    await Database
      .from('channel_users')
      .where('channel_id', channel.id)
      .where('user_id', userToRevoke.id)
      .delete();

    await Database
      .from('kicks')
      .where('channel_id', channel.id)
      .where(function () {
        this.where('kicked_id', userToRevoke.id)  // Remove kicks against this user
          .orWhere('user_id', userToRevoke.id)  // Remove kicks made by this user
      })
      .delete();

    return {
      channelName: channel.name,
      username: userToRevoke.nickname
    };
  }

  public async kickUser(wsContext: WsContextContract, username: string) {
    const { params, socket, auth } = wsContext;
    const roomName = `channels/${params.name}`;

    try {
      const channel = await Channel.findByOrFail('name', params.name);

      let userToKick;
      try {
        userToKick = await User.findByOrFail('nickname', username);
      } catch (error) {
        socket.emit('error', { message: `User "${username}" does not exist` });
        return;
      }

      if (channel.ownerId === userToKick!.id) {
        socket.emit('error', { message: 'Cannot kick an admin' });
        return;
      }

      // Check if user is in channel
      const membership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToKick.id)
        .first();

      if (!membership) {
        socket.emit('error', { message: 'User is not a member of this channel' });
        return;
      }

      // If requester is owner, revoke immediately
      if (channel.ownerId === auth.user!.id) {
        const result = await this.revokeUser(channel, userToKick);

        // Global broadcast to handle all user's sockets/tabs
        Ws.io.emit('revoked', result);

        socket.to(roomName).emit('userRevoked', result);
        socket.emit('userRevoked', result);

        const message = await this.messageRepository.create(params.name, -1,
          `${username} was kicked from the channel by admin`);
        socket.broadcast.emit('message', message);
        socket.emit('message', message);

        return;
      }

      // Check if this user has already kicked the target
      const existingKick = await Database
        .from('kicks')
        .where('channel_id', channel.id)
        .where('kicked_id', userToKick.id)
        .where('user_id', auth.user!.id)
        .first();

      if (existingKick) {
        socket.emit('error', { message: 'You have already voted to kick this user' });
        return;
      }

      // Record the new kick
      await Database.table('kicks').insert({
        channel_id: channel.id,
        kicked_id: userToKick.id,
        user_id: auth.user!.id,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Count total unique kicks for this user in this channel
      const kickCount = await Database
        .from('kicks')
        .where('channel_id', channel.id)
        .where('kicked_id', userToKick.id)
        .countDistinct('user_id as total');

      const totalKicks = kickCount[0].total;

      if (totalKicks >= 3) {
        // If enough kicks accumulated, revoke user
        const result = await this.revokeUser(channel, userToKick);

        // Global broadcast to handle all user's sockets/tabs
        Ws.io.emit('revoked', result);

        socket.to(roomName).emit('userRevoked', result);
        socket.emit('userRevoked', result);

        const message = await this.messageRepository.create(params.name, -1,
          `${username} was kicked from the channel by vote`);
        socket.broadcast.emit('message', message);
        socket.emit('message', message);
      }
      else {
        // announce votekicking
        const message = await this.messageRepository.create(params.name, -1,
          `${username} received a kick vote (${3 - totalKicks} more needed for kick)`)
        socket.broadcast.emit('message', message)
        socket.emit('message', message)
      }
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to kick user' });
    }
  }

  public async inviteUser({ params, socket, auth }: WsContextContract, username: string) {
    const roomName = `channels/${params.name}`;

    try {
      const channel = await Channel.findByOrFail('name', params.name);
      let userToInvite;
      try {
        userToInvite = await User.findByOrFail('nickname', username);
      } catch (error) {
        socket.emit('error', { message: `User "${username}" does not exist` });
        return;
      }

      // Check if user is already in channel
      const existingMembership = await Database
        .from('channel_users')
        .where('channel_id', channel.id)
        .where('user_id', userToInvite.id)
        .first();

      if (existingMembership) {
        socket.emit('error', { message: 'User is already a member of this channel' });
        return;
      }

      // Check if user is banned
      const isBanned = await Database
        .from('banned_users')
        .where('channel_id', channel.id)
        .where('user_id', userToInvite.id)
        .first();

      if (isBanned) {
        if (channel.ownerId !== auth.user!.id) {
          socket.emit('error', { message: 'This user has been banned from the channel' });
          return;
        }
        // If admin is inviting, remove the ban
        await Database
          .from('banned_users')
          .where('channel_id', channel.id)
          .where('user_id', userToInvite.id)
          .delete();
      }

      // For private channels, only owner can invite
      if (channel.isPrivate && channel.ownerId !== auth.user!.id) {
        socket.emit('error', { message: 'Only channel owner can add users to private channels' });
        return;
      }

      // For public channels, check if inviter is a member
      if (!channel.isPrivate) {
        const inviterIsMember = await Database
          .from('channel_users')
          .where('channel_id', channel.id)
          .where('user_id', auth.user!.id)
          .first();

        if (!inviterIsMember) {
          socket.emit('error', { message: 'You must be a member of the channel to add others' });
          return;
        }
      }

      // Add user to channel
      await Database.table('channel_users').insert({
        channel_id: channel.id,
        user_id: userToInvite.id,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Signal to the invited user to refresh their state
      // This will be broadcast to everyone but the frontend should
      // only act on it if the username matches their own
      Ws.io.emit('userInvited', {
        channelName: channel.name,
        username: userToInvite.nickname
      });

      socket.to(roomName).emit('userJoined', {
        channelName: channel.name,
        username: userToInvite.nickname
      });

      socket.emit('userJoined', {
        channelName: channel.name,
        username: userToInvite.nickname
      });

      const unbanMessage = isBanned ? ` (ban removed)` : '';
      const message = await this.messageRepository.create(params.name, -1,
        `${username} was invited to the channel by ${auth.user?.nickname}${unbanMessage}`);
      socket.broadcast.emit('message', message);
      socket.emit('message', message);

    } catch (error) {
      console.error('Error adding user:', error);
      socket.emit('error', { message: error.message || 'Failed to add user' });
    }
  }
}
