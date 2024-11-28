import { Store as VuexStore } from 'vuex';
import { StateInterface } from 'src/store';

export const handleCommand = (command: string, store: VuexStore<StateInterface>) => {
  const [mainCommand, ...args] = command.split(' ');

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
        store.dispatch('channels/join', {
          channel: channelName,
          isPrivate: privacy === 'private'
        });
      } else {
        store.dispatch('channels/join', channelName);
      }
      return true;
    }

    case 'leave':
      leaveChannel();
      return true;

    case 'invite':
      inviteUser();
      return true;

    case 'revoke':
      revokeUser();
      return true;

    case 'quit':
      destroyChannel();
      return true;

    case 'help':
      showHelp();
      return true;

    case 'test':
      console.log('Testing commands');
      return true;

    // Add more cases as needed

    default:
      console.log('Unknown command:', mainCommand);
      return false;
  }
};



