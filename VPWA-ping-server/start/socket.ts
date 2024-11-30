import Ws from '@ioc:Ruby184/Socket.IO/Ws'

// Root namespace only for channel loading
Ws.namespace('/')
  .on('loadChannels', 'MessageController.loadChannels')

// Activity tracking namespace
Ws.namespace('/activity')
  .connected('ActivityController.onConnected')
  .disconnected('ActivityController.onDisconnected')

// Channel specific namespace
Ws.namespace('channels/:name')
  .on('loadMessages', 'MessageController.loadMessages')
  .on('addMessage', 'MessageController.addMessage')
  .on('typing:start', 'MessageController.handleTypingStart')
  .on('typing:stop', 'MessageController.handleTypingStop')
  .on('listMembers', 'MessageController.listMembers')
  .on('leaveChannel', 'MessageController.leaveChannel')
  .on('deleteChannel', 'MessageController.deleteChannel')
  .on('revokeUser', 'MessageController.revokeUser')
