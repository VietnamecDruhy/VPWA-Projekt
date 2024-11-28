import { ref, Ref, onMounted } from 'vue'
import { useQuasar, QNotifyCreateOptions, } from 'quasar'
import { useStore } from 'vuex';
import ChatComponent from 'src/components/ChatComponent.vue';

interface Group {
  id: number
  name: string
}

interface Channel {
  name: string
  isPublic: boolean
  memberCount: number
}

export default {
  components: { ChatComponent },

  setup() {
    const $q = useQuasar()
    const leftDrawerOpen = ref(false)
    const rightDrawerOpen = ref(false)
    const searchQuery = ref('')
    const text = ref('')
    const isDialogOpen = ref(false);
    const newChatName = ref('');
    const isPrivateChat = ref(false);
    const store = useStore();

    onMounted(() => {
      console.log('Hello');
      console.log('Store Getters:', store);
    });

    const groups: Ref<Group[]> = ref([
      { id: 1, name: 'general' },
      { id: 2, name: 'Family' },
      { id: 3, name: 'Friends' },
      { id: 4, name: 'Work' },
      { id: 5, name: 'School' },
      { id: 6, name: 'Skuska af adg ad g ad hg adh a a hwh ' }
    ])

    const chatUsers: Ref<Group[]> = ref([
      { id: 1, name: 'Joe', state: 'online', isAdmin: false },
      { id: 2, name: 'Sarah', state: 'online', isAdmin: false },
      { id: 3, name: 'Sam', state: 'offline', isAdmin: false },
      { id: 4, name: 'Adam', state: 'online', isAdmin: true },
      { id: 5, name: 'Fero', state: 'online', isAdmin: false }
    ])

    // Current logged-in user's profile
    const currentUser: Ref<{ id: number; name: string; state: string; }> = ref({
      id: 5,
      name: 'Fero',
      state: 'online',
    })

    const currentChannel: Ref<Channel> = ref({
      name: 'general',
      isPublic: false,
      memberCount: chatUsers.value.length
    })

    const setUserStatus = (status: string) => {
      currentUser.value.state = status
      showNotification(`You are now ${status}`, 'info')
    }

    const openCreateChatDialog = () => {
      isDialogOpen.value = true;
    };

    const createChat = () => {
      if (newChatName.value.trim()) {
        const newChat = {
          name: newChatName.value,
          isPrivate: isPrivateChat.value,
        };

        newChatName.value = '';
        isPrivateChat.value = false;
        isDialogOpen.value = false;
      }
    };

    const toggleLeftDrawer = () => {
      leftDrawerOpen.value = !leftDrawerOpen.value
    }

    const toggleRightDrawer = () => {
      rightDrawerOpen.value = !rightDrawerOpen.value
    }

    const formatTime = (timestamp: Date): string => {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const truncateText = (text: string): string => {
      const maxTextLength = 18
      if (text.length > maxTextLength) {
        return text.substring(0, maxTextLength) + '...'
      }
      return text
    }

    const showNotification = (message: string, type: string = 'info', timeout: number = 0) => {
      console.log('$q object:', $q)
      const notifyOptions: QNotifyCreateOptions = {
        message: message,
        position: 'top',
        color: type,
        timeout: timeout,
        actions: [{ icon: 'close', color: 'white' }]
      }
      $q.notify(notifyOptions)
    }

    return {
      leftDrawerOpen,
      rightDrawerOpen,
      searchQuery,
      groups,
      currentChannel,
      text,
      toggleLeftDrawer,
      toggleRightDrawer,
      formatTime,
      truncateText,
      currentUser,
      setUserStatus,
      isDialogOpen,
      newChatName,
      isPrivateChat,
      openCreateChatDialog,
      createChat,
    }
  },
}
