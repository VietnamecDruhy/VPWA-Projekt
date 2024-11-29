/*
|--------------------------------------------------------------------------
| Websocket events
|--------------------------------------------------------------------------
|
| This file is dedicated for defining websocket namespaces and event handlers.
|
*/

import Ws from '@ioc:Ruby184/Socket.IO/Ws'

Ws.namespace('/')
  .connected(({ socket }) => {
    console.log('new websocket connection: ', socket.id)
  })
  .disconnected(({ socket }, reason) => {
    console.log('websocket disconnecting: ', socket.id, reason)
  })
  .on('hello', ({ socket }, msg: string) => {
    console.log('websocket greeted: ', socket.id, msg)
    return 'hi'
  })
  .on("loadChannels", "MessageController.loadChannels");

Ws.namespace("channels/:name")
  .on("loadMessages", "MessageController.loadMessages")
  .on("addMessage", "MessageController.addMessage")
  .on("typing:start", "MessageController.handleTypingStart")
  .on("typing:stop", "MessageController.handleTypingStop")

  .on("listMembers", "MessageController.listMembers")
  .on("leaveChannel", "MessageController.leaveChannel")
  .on("deleteChannel", "MessageController.deleteChannel")
  .on("revokeUser", "MessageController.revokeUser")
