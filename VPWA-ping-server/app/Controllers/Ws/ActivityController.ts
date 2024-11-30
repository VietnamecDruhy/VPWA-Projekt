import type { WsContextContract } from "@ioc:Ruby184/Socket.IO/WsContext";
import User from "App/Models/User";

export default class ActivityController {
  private getUserRoom(user: User): string {
    return `user:${user.id}`;
  }

  public async onConnected({ socket, auth, logger }: WsContextContract) {
    // all connections for the same authenticated user will be in the room
    const room = this.getUserRoom(auth.user!);
    const userSockets = await socket.in(room).allSockets();

    // this is first connection for given user
    if (userSockets.size === 0) {
      // Use broadcast to all namespaces
      socket.nsp.server.emit("user:online", auth.user);
    }

    // add this socket to user room
    socket.join(room);
    // add userId to data shared between Socket.IO servers
    socket.data.userId = auth.user!.id;

    const allSockets = await socket.nsp.except(room).fetchSockets();
    const onlineIds = new Set<number>();

    for (const remoteSocket of allSockets) {
      onlineIds.add(remoteSocket.data.userId);
    }

    const onlineUsers = await User.findMany([...onlineIds]);

    socket.emit("user:list", onlineUsers);

    logger.info("new websocket connection in activity namespace");
  }

  public async onDisconnected(
    { socket, auth, logger }: WsContextContract,
    reason: string
  ) {
    const room = this.getUserRoom(auth.user!);
    const userSockets = await socket.in(room).allSockets();

    // user is disconnected
    if (userSockets.size === 0) {
      // notify other users across all namespaces
      socket.nsp.server.emit("user:offline", auth.user);
    }

    logger.info("websocket disconnected from activity namespace", reason);
  }
}
