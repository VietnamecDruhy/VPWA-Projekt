import type { WsContextContract } from "@ioc:Ruby184/Socket.IO/WsContext";
import User from "App/Models/User";

export default class ActivityController {
  private getUserRoom(user: User): string {
    return `user:${user.id}`;
  }

  public async onConnected({ socket, auth, logger }: WsContextContract) {
    logger.info('New connection to activity namespace');
    const room = this.getUserRoom(auth.user!);

    console.log(`User ${auth.user!.nickname} connected to activity namespace`);
    const userSockets = await socket.in(room).allSockets();

    if (userSockets.size === 0) {
      console.log(`Broadcasting user:online event for ${auth.user!.nickname}`);
      socket.nsp.server.emit("user:online", auth.user);
    }

    socket.join(room);
    console.log(`User ${auth.user!.nickname} joined room ${room}`);

    socket.data.userId = auth.user!.id;
    socket.data.userState = 'online';  // Default state

    const allSockets = await socket.nsp.except(room).fetchSockets();
    const onlineIds = new Set<number>();

    for (const remoteSocket of allSockets) {
      if (remoteSocket.data.userState !== 'dnd') {
        onlineIds.add(remoteSocket.data.userId);
      }
    }

    const onlineUsers = await User.findMany([...onlineIds]);
    console.log('Sending online users list:', onlineUsers);
    socket.emit("user:list", onlineUsers);
  }

  public async onDisconnected({ socket, auth, logger }: WsContextContract, reason: string) {
    logger.info('User disconnected from activity namespace', { reason });
    console.log(`User ${auth.user!.nickname} disconnected. Reason: ${reason}`);

    const room = this.getUserRoom(auth.user!);
    const userSockets = await socket.in(room).allSockets();

    if (userSockets.size === 0) {
      console.log(`Broadcasting user:offline event for ${auth.user!.nickname}`);
      socket.nsp.server.emit("user:offline", auth.user);
    }
  }

  public async setState({ socket, auth, logger }: WsContextContract, state: string) {
    try {
      console.log(`Setting state for user ${auth.user!.nickname} to ${state}`);
      socket.data.userState = state;

      // Notify all clients about the state change
      console.log('Broadcasting state change to all clients');
      socket.nsp.server.emit("user:stateChange", {
        userId: auth.user!.id,
        state: state
      });

      logger.info('User state updated successfully', {
        userId: auth.user!.id,
        state: state
      });
    } catch (error) {
      console.error('Error setting user state:', error);
      logger.error('Failed to update user state', {
        userId: auth.user!.id,
        state: state,
        error: error
      });
      socket.emit('error', { message: 'Failed to update user state' });
    }
  }
}