import { Store as VuexStore } from 'vuex';
import { StateInterface } from 'src/store';

export const handleCommand = async (
  command: string,
  store: VuexStore<StateInterface>
) => {
  const [mainCommand, ...args] = command.split(' ');
  const currentChannel = store.state.channels.active;

  if (!currentChannel && !['help'].includes(mainCommand)) {
    store.commit('channels/SOCKET_ERROR', {
      message: 'No active channel selected',
      type: 'negative'
    });
    return false;
  }

  switch (mainCommand) {
    case 'join': {
      if (args.length === 0) {
        store.commit('channels/SOCKET_ERROR', {
          message: 'Usage: /join <channel_name> [private|public]',
          type: 'warning'
        });
        return false;
      }

      if (args.length > 2) {
        store.commit('channels/SOCKET_ERROR', {
          message: 'Too many arguments. Usage: /join <channel_name> [private|public]',
          type: 'warning'
        });
        return false;
      }

      const channelName = args[0];

      if (args[1]) {
        const privacy = args[1].toLowerCase();
        if (privacy !== 'private' && privacy !== 'public') {
          store.commit('channels/SOCKET_ERROR', {
            message: 'Invalid privacy setting. Use "private" or "public"',
            type: 'warning'
          });
          return false;
        }
        try {
          await store.dispatch('channels/join', {
            channel: channelName,
            isPrivate: privacy === 'private',
          });
          store.commit('channels/SOCKET_ERROR', {
            message: `Successfully joined ${channelName}`,
            type: 'positive'
          });
        } catch (error) {
          store.commit('channels/SOCKET_ERROR', {
            message: `Failed to join ${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'negative'
          });
        }
      } else {
        try {
          await store.dispatch('channels/join', channelName);
          store.commit('channels/SOCKET_ERROR', {
            message: `Successfully joined ${channelName}`,
            type: 'positive'
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('private')) {
            store.commit('channels/SOCKET_ERROR', {
              message: `Cannot join ${channelName}: This is a private channel (invite only)`,
              type: 'warning'
            });
          } else {
            store.commit('channels/SOCKET_ERROR', {
              message: `Failed to join ${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              type: 'negative'
            });
          }
        }
      }
      return true;
    }

    case 'list': {
      try {
        if (currentChannel) {
          const members = store.state.channels.members[currentChannel] || [];
          const memberList = members
            .map(member => member.nickname)
            .sort()
            .join('\n• ');

          store.commit('channels/NEW_MESSAGE', {
            channel: currentChannel,
            message: {
              id: Date.now(),
              content: `Current members in ${currentChannel}:\n• ${memberList}`,
              channelId: currentChannel,
              userId: -1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: {
                id: -1,
                nickname: 'system',
                email: 'system@system.com',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }
          });
          return true;
        }
        throw new Error('No active channel selected');
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to list members: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;
      }
    }

    case 'cancel': {
      try {
        if (currentChannel != 'general') {
          await store.dispatch('channels/leaveChannel', currentChannel);
          store.commit('channels/SOCKET_ERROR', {
            message: `Successfully left ${currentChannel}`,
            type: 'positive'
          });
        } else {
          store.commit('channels/SOCKET_ERROR', {
            message: `Can't leave general`,
            type: 'negative'
          });
        }
        return true;
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to leave channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;
      }
    }

    case 'quit': {
      try {
        await store.dispatch('channels/deleteChannel', currentChannel);
        store.commit('channels/SOCKET_ERROR', {
          message: `Successfully deleted ${currentChannel}`,
          type: 'positive'
        });
        return true;
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to delete channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;
      }
    }

    case 'revoke': {
      if (args.length === 0) {
        store.commit('channels/SOCKET_ERROR', {
          message: 'Usage: /revoke <username>',
          type: 'warning'
        });
        return false;
      }

      try {
        if (currentChannel != 'general') {
          await store.dispatch('channels/kickUser', {
            channel: currentChannel,
            username: args[0],
          });
          return true;
        }
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to revoke user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;
      }
    }

    case 'kick': {
      if (args.length === 0) {
        store.commit('channels/SOCKET_ERROR', {
          message: 'Usage: /kick <username>',
          type: 'warning'
        });
        return false;
      }

      try {
        if (currentChannel != 'general') {
          await store.dispatch('channels/kickUser', {
            channel: currentChannel,
            username: args[0],
          });
          return true;
        }
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to kick user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;

      }
    }

    case 'invite': {
      if (args.length === 0) {
        store.commit('channels/SOCKET_ERROR', {
          message: 'Usage: /invite <username>',
          type: 'warning'
        });
        return false;
      }

      try {
        await store.dispatch('channels/inviteUser', {
          channel: currentChannel,
          username: args[0],
        });
        store.commit('channels/SOCKET_ERROR', {
          message: `Successfully invited ${args[0]} to ${currentChannel}`,
          type: 'positive'
        });
        return true;
      } catch (error) {
        store.commit('channels/SOCKET_ERROR', {
          message: `Failed to invite user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'negative'
        });
        return false;
      }
    }

    case 'help': {
      store.commit('channels/NEW_MESSAGE', {
        channel: currentChannel,
        message: {
          id: Date.now(),
          content: 'Available commands:\n' +
            '/list - Show all members in the current channel\n' +
            '/cancel - Leave the current channel (deletes channel if you\'re the owner)\n' +
            '/quit - Delete the channel (owner only)\n' +
            '/revoke <username> - Remove a user from the channel (owner only)\n' +
            '/kick <username> - Vote to kick a user from the channel\n' +
            '/invite <username> - Invite a user to the channel\n' +
            '/help - Show this help message',
          channelId: currentChannel,
          userId: -1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: -1,
            nickname: 'system',
            email: 'system@system.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      });
      return true;
    }

    default: {
      store.commit('channels/SOCKET_ERROR', {
        message: `Unknown command: ${mainCommand}`,
        type: 'warning'
      });
      return false;
    }
  }
}