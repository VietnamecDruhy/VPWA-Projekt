import { Store as VuexStore } from 'vuex'
import { StateInterface } from 'src/store'


export const handleCommand = (command: string, store: VuexStore<StateInterface>): boolean => {
    console.log('Command received:', command)
    switch (command) {
        case 'join':
            joinChannel()
            return true
        case 'cancel':
            leaveChannel()
            return true
        case 'invite':
            inviteUser()
            return true
        case 'revoke':
            revokeUser()
            return true
        case 'quit':
            destroyChannel()
            return true
        case 'help':
            showHelp()
            return true
        case 'test':
            console.log('Testing commands')
            return true
        // // case 'list':
        // //   showList()
        //   return true
        default:
            return false
    }
}

