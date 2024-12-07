// src/services/ChannelService.ts
import { RawMessage, SerializedMessage } from 'src/contracts'
import { BootParams, SocketManager } from './SocketManager'

interface ChannelUser {
  id: number;
  nickname: string;
  email: string;
}

interface ChannelServiceInterface {
  closeConnection(name: string): void;
}

class ChannelSocketManager extends SocketManager {
  private static serviceInstance: ChannelServiceInterface | null = null;

  public static setService(service: ChannelServiceInterface): void {
    ChannelSocketManager.serviceInstance = service;
  }

  public static getService(): ChannelServiceInterface {
    if (!ChannelSocketManager.serviceInstance) {
      throw new Error('ChannelService instance not set');
    }
    return ChannelSocketManager.serviceInstance;
  }

  public kickUser(username: string): Promise<void> {
    return this.emitAsync('kickUser', username);
  }

  public inviteUser(username: string): Promise<void> {
    return this.emitAsync('inviteUser', username);
  }


  public subscribe({ store }: BootParams): void {
    const channel = this.namespace.split('/').pop() as string;

    this.socket.on('loadMessages:error', (error) => {
      console.error('Socket loadMessages error:', error);
    });

    this.socket.on('loadMessages:response', (data: {
      messages: SerializedMessage[],
      channelInfo: {
        name: string,
        isPrivate: boolean
      }
    }) => {
      store.commit('channels/LOADING_SUCCESS', {
        channel: data.channelInfo.name,
        messages: data.messages,
        isPrivate: data.channelInfo.isPrivate
      });
    });

    this.socket.on('message', (message: SerializedMessage) => {
      store.commit('channels/NEW_MESSAGE', { channel, message });
    });

    this.socket.on('loadChannels:response', (channels) => {
      store.commit('channels/SET_JOINED_CHANNELS', channels);
    });

    this.socket.on('typing:start', (user) => {
      store.commit('channels/SET_TYPING', {
        channel,
        user: user,
        isTyping: true
      });
    });

    this.socket.on('typing:stop', (user) => {
      store.commit('channels/SET_TYPING', { channel, user, isTyping: false });
    });

    this.socket.on('channelMembers', (members: ChannelUser[]) => {
      store.commit('channels/SET_CHANNEL_MEMBERS', { channel, members });
    });

    this.socket.on('channelDeleted', (channelName: string) => {
      store.commit('channels/CLEAR_CHANNEL', channelName);
      const service = (this.constructor as typeof ChannelSocketManager).getService();
      service.closeConnection(channelName);
    });

    this.socket.on('leftChannel', (channelName: string) => {
      store.commit('channels/CLEAR_CHANNEL', channelName);
      const service = (this.constructor as typeof ChannelSocketManager).getService();
      service.closeConnection(channelName);
    });

    this.socket.on('revoked', (data: { channelName: string, username: string }) => {
      // Check if this event is meant for the current user
      if (store.state.auth.user?.nickname === data.username) {
        store.commit('channels/CLEAR_CHANNEL', data.channelName);
        const service = (this.constructor as typeof ChannelSocketManager).getService();
        service.closeConnection(data.channelName);
      }
    });

    this.socket.on('userRevoked', (data: { channelName: string; username: string }) => {
      store.commit('channels/REMOVE_CHANNEL_MEMBER', data);
    });

    this.socket.on('userJoined', ({ channelName, username }: { channelName: string, username: string }) => {
      store.commit('channels/ADD_CHANNEL_MEMBER', { channelName, username });
    });

    // Handle disconnect event
    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected for channel ${channel}. Reason: ${reason}`);
    });

    this.socket.on('userInvited', async (data: { channelName: string; username: string }) => {
      // Only handle the event if it's for the current user
      const currentUser = store.state.auth.user;
      if (currentUser?.nickname === data.username) {
        // Trigger a join to refresh the channel state
        try {
          await store.dispatch('channels/join', data.channelName);
        } catch (error) {
          console.error('Error joining channel after invite:', error);
        }
      }
    });
  }

  public listMembers(): Promise<ChannelUser[]> {
    return this.emitAsync('listMembers');
  }

  public async leaveChannel(): Promise<void> {
    try {
      await this.emitAsync('leaveChannel');
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  }

  public async deleteChannel(): Promise<void> {
    try {
      await this.emitAsync('deleteChannel');
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  }

  public revokeUser(username: string): Promise<void> {
    return this.emitAsync('revokeUser', username);
  }

  public emitTyping(isTyping: boolean, content?: string): void {
    this.socket.emit(isTyping ? 'typing:start' : 'typing:stop', { content });
  }

  public addMessage(message: RawMessage): Promise<SerializedMessage> {
    return this.emitAsync('addMessage', message);
  }

  public loadMessages(messageId?: string, isPrivate?: boolean): Promise<SerializedMessage[]> {
    return this.emitAsync('loadMessages', { messageId, isPrivate });
  }

  public loadChannels(): Promise<void> {
    return this.emitAsync('loadChannels');
  }
}

class ChannelService implements ChannelServiceInterface {
  private channels: Map<string, ChannelSocketManager> = new Map();
  private rootChannel: ChannelSocketManager;

  constructor() {
    this.rootChannel = new ChannelSocketManager('/');
    // Set the service instance for static access
    ChannelSocketManager.setService(this);
  }

  public loadChannels(): Promise<void> {
    return this.rootChannel.loadChannels();
  }

  public join(name: string): ChannelSocketManager {
    if (this.channels.has(name)) {
      throw new Error(`User is already joined in channel "${name}"`);
    }

    const channel = new ChannelSocketManager(`/channels/${name}`);
    this.channels.set(name, channel);
    return channel;
  }

  public closeConnection(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      // Ensure socket is disconnected before cleanup
      if (channel.socket.connected) {
        channel.socket.disconnect();
      }
      channel.destroy();
      this.channels.delete(name);
      console.log(`Channel ${name} connection closed and cleaned up`);
    }
  }

  public leave(name: string): boolean {
    const channel = this.channels.get(name);
    if (!channel) {
      return false;
    }
    // Ensure proper cleanup
    this.closeConnection(name);
    return true;
  }

  public in(name: string): ChannelSocketManager | undefined {
    return this.channels.get(name);
  }
}

export default new ChannelService();
