import { Store as VuexStore } from 'vuex';
import { StateInterface } from 'src/store';

export const handleCommand = async (command: string, store: VuexStore<StateInterface>) => {
  const [mainCommand, ...args] = command.split(' ');
  const currentChannel = store.state.channels.active;

  if (!currentChannel && !['help'].includes(mainCommand)) {
    console.log('No active channel');
    return false;
  }

  switch (mainCommand) {
    case 'join': {
      if (args.length === 0) {
        console.log('Usage: /join <channel_name> [private|public]');
        return false;
      }

      if (args.length > 2) {
        console.log('Too many arguments. Usage: /join <channel_name> [private|public]');
        return false;
      }

      const channelName = args[0];

      if (args[1]) {
        const privacy = args[1].toLowerCase();
        if (privacy !== 'private' && privacy !== 'public') {
          console.log('Invalid privacy setting. Use "private" or "public"');
          return false;
        }
        await store.dispatch('channels/join', {
          channel: channelName,
          isPrivate: privacy === 'private',
        });
      } else {
        store
          .dispatch('channels/join', channelName)
          .catch((error) => {
            if (error.message.includes('private')) {
              console.log(`Cannot join ${channelName}: This is a private channel (invite only)`);
            } else {
              console.error('Error joining channel:', error.message);
            }
          });
      }
      return true;
    }

    case 'list': {
      try {
        await store.dispatch('channels/listMembers', currentChannel);
        return true;
      } catch (error) {
        console.error('Error listing members:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'cancel': {
      try {
        await store.dispatch('channels/leaveChannel', currentChannel);
        return true;
      } catch (error) {
        console.error('Error leaving channel:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'quit': {
      try {
        await store.dispatch('channels/deleteChannel', currentChannel);
        return true;
      } catch (error) {
        console.error('Error deleting channel:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'revoke': {
      if (args.length === 0) {
        console.log('Usage: /revoke <username>');
        return false;
      }

      try {
        await store.dispatch('channels/kickUser', {
          channel: currentChannel,
          username: args[0],
        });
        return true;
      } catch (error) {
        console.error('Error revoking user:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'kick': {
      if (args.length === 0) {
        console.log('Usage: /kick <username>');
        return false;
      }

      try {
        await store.dispatch('channels/kickUser', {
          channel: currentChannel,
          username: args[0],
        });
        return true;
      } catch (error) {
        console.error('Error kicking user:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'invite': {
      if (args.length === 0) {
        console.log('Usage: /invite <username>');
        return false;
      }

      try {
        await store.dispatch('channels/inviteUser', {
          channel: currentChannel,
          username: args[0],
        });
        return true;
      } catch (error) {
        console.error('Error inviting user:', error instanceof Error ? error.message : 'Unknown error');
        return false;
      }
    }

    case 'help': {
      console.log(
        `
Available commands:
/list - Show all members in the current channel
/cancel - Leave the current channel (deletes channel if you're the owner)
/quit - Delete the channel (owner only)
/revoke <username> - Remove a user from the channel (owner only)
/kick <username> - Kick a user from the channel
/invite <username> - Invite a user to the channel
/help - Show this help message
        `.trim()
      );
      return true;
    }

    default: {
      console.log('Unknown command:', mainCommand);
      return false;
    }
  }
};
