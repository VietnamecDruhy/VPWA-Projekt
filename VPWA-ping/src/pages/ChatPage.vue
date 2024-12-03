<template>
  <q-layout view="hHh LpR lFf" class="full-height">
    <!-- Navbar -->
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="q-pa-none sf-pro-700" style="text-align: center;">
          {{ selectedChannel }} {{ isPrivate ? '🔒' : '🌍' }}
        </q-toolbar-title>

        <q-btn dense flat round icon="settings" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer -->
    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered class="bg-dark sf-pro-600">
      <q-input dense debounce="300" placeholder="Search..." v-model="searchQuery" class="search-input q-ma-md" rounded
        outlined clearable bg-color="white">
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-list bordered>
        <q-item v-for="(channel, index) in channels" :key="index" class="text-white sf-pro-600" clickable v-ripple
          @click="selectChannel(channel)" :class="{ 'bg-primary': selectedChannel === channel }">
          <q-item-section avatar>
            <q-avatar color="secondary" text-color="white" class="q-mb-xs sf-pro-400 inset-shadow-down">
              {{ channel.charAt(0).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ truncateText(channel) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <!-- <q-btn flat round dense icon="sms" color="white" @click="sendMessage" /> -->
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Right Drawer -->
    <q-drawer show-if-above v-model="rightDrawerOpen" side="right" bordered class="bg-dark">
  <q-list class="q-pa-md">
    <!-- User Avatar and Name -->
    <div class="text-center q-mt-lg">
      <q-avatar size="150px" class="q-mb-sm">
        <img src="https://cdn.quasar.dev/img/boy-avatar.png" />
      </q-avatar>
      <q-item-label header class="text-white text-h6 q-mb-md">{{ currentUser?.nickname }}</q-item-label>
    </div>

    <!-- User Status -->
    <q-item class="q-mb-xs">
      <q-item-section avatar>
        <q-icon :name="getStateIcon" :color="getStateColor" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-white">My status</q-item-label>
        <q-item-label caption class="text-grey-5">
          {{ getStateLabel }}
        </q-item-label>
      </q-item-section>
    </q-item>

    <!-- Channel Info -->
    <q-item class="q-mb-xs">
      <q-item-section avatar>
        <q-icon :name="isPrivate ? 'lock' : 'public'" color="white" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-white">{{ selectedChannel }}</q-item-label>
        <q-item-label caption class="text-grey-5">
          {{ isPrivate ? 'Private' : 'Public' }} Channel
        </q-item-label>
      </q-item-section>
    </q-item>

    <!-- Member Count -->
    <q-item>
      <q-item-section avatar>
        <q-icon name="group" color="white" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-white">{{ memberCount }} members</q-item-label>
      </q-item-section>
    </q-item>

    <q-separator color="grey-7" class="q-my-md" />

    <!-- Settings Section -->
    <q-item-label header class="text-white q-mb-md">Settings</q-item-label>

    <!-- User Status Settings -->
    <q-expansion-item
      icon="mood"
      label="Status"
      caption="Set your availability"
      header-class="text-white"
      expand-separator
    >
      <q-list>
        <q-item clickable v-ripple @click="setUserStatus('online')" :active="userState === 'online'">
          <q-item-section avatar>
            <q-icon name="check_circle" color="positive" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Available</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="setUserStatus('dnd')" :active="userState === 'dnd'">
          <q-item-section avatar>
            <q-icon name="do_not_disturb" color="warning" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Do Not Disturb</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="setUserStatus('offline')" :active="userState === 'offline'">
          <q-item-section avatar>
            <q-icon name="remove_circle" color="grey" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Offline</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <!-- Mention Only Toggle -->
    <q-item clickable v-ripple @click="toggleMentionOnly" class="q-mb-sm">
      <q-item-section avatar>
        <q-icon name="notifications" color="white" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-white">Mention Only</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="MessageMention" color="primary" keep-color />
      </q-item-section>
    </q-item>

    <!-- Logout Button -->
    <div class="row justify-center">
      <q-btn color="primary" label="Logout" class="q-mt-md" @click="logout" />
    </div>
  </q-list>
    </q-drawer>

    <!-- Channel Messages -->
    <q-page-container>
      <ChatComponent :active-channel="selectedChannel" />
    </q-page-container>

  </q-layout>
</template>

<script setup lang="ts">
// import ChatPage from '../utils/ChatPageLogic';
import ChatComponent from '../components/ChatComponent.vue';
import { ref, Ref, onMounted, computed } from 'vue'
import { useQuasar, QNotifyCreateOptions, } from 'quasar'
import { useStore } from 'src/store';
import ChannelService from 'src/services/ChannelService'
import activityService, { UserState } from 'src/services/ActivityService';

// define store
const store = useStore()

// public or private
const isPrivate = computed(() => {
  if (!selectedChannel.value) return false;
  return store.state.channels.isPrivate[selectedChannel.value] ? true : false;
});

const memberCount = computed(() => {
  const count = store.state.channels.members[selectedChannel.value]?.length || 0
  return count
})

// current user
const currentUser = store.state.auth.user

// joined channels
const channels = computed(() => {
  const channelList = store.getters['channels/joinedChannels'] || []
  if (channelList.length > 1) {
    const lastChannel = channelList[channelList.length - 1]
    return [lastChannel, ...channelList.slice(0, -1)]
  }
  return channelList
})
const selectedChannel = ref(channels.value[0])

const selectChannel = (channel: string) => {
  selectedChannel.value = channel
}

// activity
// User state handling
const userState = ref<UserState>('online')

// Update the setUserStatus function
const setUserStatus = (status: UserState) => {
  userState.value = status
  activityService.updateUserState(status)
  
  // Get appropriate notification content
  const message = {
    online: 'You are now online',
    offline: 'You appear offline to others',
    dnd: 'Do Not Disturb mode activated'
  }[status]

  const color = {
    online: 'positive',
    offline: 'grey',
    dnd: 'warning'
  }[status]

  showNotification(message, color)
}

// Helper function for state icon
const getStateIcon = computed(() => {
  return {
    online: 'check_circle',
    offline: 'remove_circle',
    dnd: 'do_not_disturb'
  }[userState.value] || 'help'
})

// Helper function for state color
const getStateColor = computed(() => {
  return {
    online: 'positive',
    offline: 'grey',
    dnd: 'warning'
  }[userState.value] || 'grey'
})

// Helper function for state label
const getStateLabel = computed(() => {
  return {
    online: 'Available',
    offline: 'Offline',
    dnd: 'Do Not Disturb'
  }[userState.value] || 'Unknown'
})

// misc !!!

// toggle drawers
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const toggleRightDrawer = () => {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

// temp

const $q = useQuasar()

const searchQuery = ref('')


// on mount
const initializeChannels = async () => {
  try {
    await ChannelService.loadChannels()    
    const currentChannels = channels.value
    console.log(currentChannels)

    const joinPromises = currentChannels.map(async (channel: string) => {
      try {
        await store.dispatch('channels/join', channel)
        await store.dispatch('channels/listMembers', channel)
        return { channel, status: 'success' }
      } catch (error) {
        console.error(`Error initializing channel ${channel}:`, error)
        return { channel, status: 'error', error }
      }
    })

    await Promise.allSettled(joinPromises)
  } catch (error) {
    console.error('Error in channel initialization:', error)
    throw error
  }
}

onMounted(async () => {
  try {
    await initializeChannels()
  } catch (error) {
    console.error('Error in onMounted channel initialization:', error)
    showNotification('Error initializing channels', 'error')
  }
})


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
</script>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

}

.me.chat-message {
  align-items: flex-end;
}

.message-header .sender {
  margin-right: 10px;
  /* Add gap between sender and timestamp */
}

.message-header {
  padding-left: 10px;
  /* Add gap between sender and timestamp */
  padding-right: 10px;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 40px 0;
  /* Adds vertical space around the divider */
  position: relative;
}

.date-divider span {
  padding: 0 10px;
  margin-bottom: 20px;
  font-weight: bold;
  color: grey;
  /* Grey font for the date */
}

.date-divider hr {
  position: absolute;
  width: 100%;
  top: 50%;
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.5);
  /* Slightly transparent grey line */
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
}

.highlighted {
  font-weight: bold;
  color: #F2C037;
}

.typing-indicator-container {
  height: 24px;
  /* Adjust this value based on your design needs */
  margin-bottom: 8px;
  /* Add some space between the typing indicator and the input */
}

.typing-indicator {
  font-style: italic;
  color: #aaa;
  animation: fadeInOut 1.5s infinite;
  cursor: pointer;
}

.typing-indicator:hover {
  text-decoration: underline;
}
</style>