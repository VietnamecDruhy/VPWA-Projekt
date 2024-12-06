import Ws from '@ioc:Ruby184/Socket.IO/Ws'


// Root namespace only for channel loading
Ws.namespace('/')
  // .middleware('auth')  // Add this line
  .on('loadChannels', 'MessageController.loadChannels')

// Activity tracking namespace
Ws.namespace('/activity')
  .connected('ActivityController.onConnected')
  .disconnected('ActivityController.onDisconnected')
  .on('user:setState', 'ActivityController.setState')

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
  .on('kickUser', 'MessageController.kickUser')
  .on('inviteUser', 'MessageController.inviteUser')
