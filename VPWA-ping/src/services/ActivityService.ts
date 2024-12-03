// src/services/ActivityService.ts
import { User } from 'src/contracts';
import { authManager } from '.';
import { SocketManager } from './SocketManager';

export type UserState = 'online' | 'offline' | 'dnd';

class ActivitySocketManager extends SocketManager {
  private currentState: UserState = 'online';

  public subscribe(): void {
    console.log('Activity socket manager subscribing to events');

    // Log connection status
    this.socket.on('connect', () => {
      console.log('Activity socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Activity socket disconnected');
    });

    this.socket.on('user:list', (onlineUsers: User[]) => {
      console.log('Received online users list:', onlineUsers);
    });

    this.socket.on('user:online', (user: User) => {
      console.log('User came online:', user);
    });

    this.socket.on('user:offline', (user: User) => {
      console.log('User went offline:', user);
    });

    this.socket.on('user:stateChange', ({ userId, state }: { userId: number, state: UserState }) => {
      console.log('Received user state change:', { userId, state });
    });

    // Log any errors
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
    console.log('Updating user state to:', state);
    this.currentState = state;

    if (this.socket.connected) {
      console.log('Emitting user:setState event');
      this.socket.emit('user:setState', state);
    } else {
      console.warn('Socket is not connected, cannot emit state change');
    }
  }
}

export default new ActivitySocketManager("/activity");