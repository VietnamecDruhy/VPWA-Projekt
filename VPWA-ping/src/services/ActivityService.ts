// src/services/ActivityService.ts
import { User } from 'src/contracts';
import { authManager } from '.';
import { BootParams, SocketManager } from './SocketManager'

export type UserState = 'online' | 'offline' | 'dnd';

class ActivitySocketManager extends SocketManager {
  private currentState: UserState = 'online';
  private lastOnlineTimestamp: string | null = null;  // Add this property


  public subscribe({ store }: BootParams): void {
    console.log('ActivitySocketManager subscribe called')

    this.socket.on('connect', () => {
      console.log('Activity socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Activity socket disconnected');
    });

    this.socket.on('user:list', (onlineUsers: User[]) => {
      console.log('Received online users list:', onlineUsers);
      store.commit('activity/SET_ONLINE_USERS', onlineUsers);
    });

    this.socket.on('user:online', (user: User) => {
      console.log('User came online:', user);
      store.commit('activity/ADD_ONLINE_USER', user);
    });

    this.socket.on('user:offline', (user: User) => {
      console.log('User went offline:', user);
      store.commit('activity/REMOVE_ONLINE_USER', user);
    });

    this.socket.on('user:stateChange', ({ userId, state }: { userId: number, state: UserState }) => {
      console.log('Received user state change:', { userId, state });
      store.commit('activity/UPDATE_USER_STATE', { userId, newState: state });
    });

    this.socket.on('error', (error: any) => {
      console.error('Activity socket error:', error);
    });

    authManager.onChange((token) => {
      if (token) {
        console.log('Auth token received, connecting socket');
        this.socket.connect();
      } else {
        console.log('Auth token removed, disconnecting socket');
        this.socket.disconnect();
      }
    });
  }

  public getCurrentState(): UserState {
    return this.currentState;
  }

  public updateUserState(state: UserState): void {
    this.currentState = state;

    if (this.socket.connected) {
      if (state === 'offline') {
        this.lastOnlineTimestamp = new Date().toISOString();
      } else {
        this.lastOnlineTimestamp = null;
      }

      this.socket.emit('user:setState', state);
    } else {
      console.warn('Socket is not connected, cannot emit state change');
    }
  }

  public getLastOnlineTimestamp(): string | null {
    return this.lastOnlineTimestamp;
  }
}

export default new ActivitySocketManager('/activity');