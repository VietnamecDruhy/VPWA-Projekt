import { Store as VuexStore } from 'vuex';
import { StateInterface } from 'src/store';

export const handleCommand = (command: string, store: VuexStore<StateInterface>) => {
  console.log('Command received:', command);

  // Split command into main command and arguments
  const [mainCommand, ...args] = command.split(' ');

  switch (mainCommand) {
    case 'join':
      if (args.length == 1) {
        store.dispatch('channels/join', args[0]);
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



