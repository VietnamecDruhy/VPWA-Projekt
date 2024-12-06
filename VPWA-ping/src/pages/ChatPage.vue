<template>
  <q-layout view="hHh LpR lFf" class="full-height">
    <!-- Navbar -->
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="q-pa-none sf-pro-700" style="text-align: center;">
          {{ selectedChannel }} {{ isPrivate ? '🔒' : '🌍' }}
        </q-toolbar-title>

        <q-btn dense flat round icon="add" @click="openCreateChannelDialog" />
        <q-btn dense flat round icon="settings" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <!-- Create Channel Dialog -->
    <q-dialog v-model="isCreateChannelOpen">
      <q-card class="bg-dark text-white" style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Create New Channel</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="newChannelName"
            label="Channel Name"
            dense
            dark
            outlined
            :rules="[
              val => !!val || 'Channel name is required',
              val => val.length <= 20 || 'Channel name must be 20 characters or less'
            ]"
          />

          <q-toggle
            v-model="isPrivateChannel"
            label="Private Channel"
            class="q-mt-md"
          />

          <div class="text-caption q-mt-sm text-grey-5">
            {{ isPrivateChannel ? 'Only invited members can join' : 'Anyone can join' }}
          </div>
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Create" @click="createChannel" :disable="!newChannelName" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Left Drawer -->
    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered class="bg-dark sf-pro-600">
      <q-input dense debounce="300" placeholder="Search..." v-model="searchQuery" class="search-input q-ma-md" rounded
               outlined clearable bg-color="white">
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-list bordered>
        <q-item v-for="(channel, index) in channels" :key="index"
                class="text-white sf-pro-600 channel-item"
                clickable v-ripple
                @click="selectChannel(channel)"
                :class="{
            'picked': selectedChannel === channel,
            'newest-channel': index === 0
          }">
          <q-item-section avatar>
            <q-avatar color="secondary" text-color="white" class="q-mb-xs sf-pro-400 inset-shadow-down">
              {{ channel.charAt(0).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ truncateText(channel) }}</q-item-label>
          </q-item-section>
          <q-item-section side v-if="selectedChannel === channel">
            <q-btn flat round dense icon="exit_to_app" color="negative" @click.stop="leaveChannel(channel)" />
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
          <q-btn color="negative" label="Log out" class="q-mt-md" @click="logout" />
        </div>
      </q-list>
    </q-drawer>

    <!-- Channel Messages -->
    <q-page-container>
      <ChatComponent  :active-channel="selectedChannel"
                      :user-state="userState"/>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import ChatComponent from '../components/ChatComponent.vue';
import { ref, Ref, onMounted, computed, watch } from 'vue'
import { useQuasar, QNotifyCreateOptions } from 'quasar'
import { useStore } from 'src/store'
import { useRouter } from 'vue-router'
import ChannelService from 'src/services/ChannelService'
import activityService, { UserState } from 'src/services/ActivityService'

const router = useRouter()

const store = useStore()
const $q = useQuasar()

// Channel creation dialog
const isCreateChannelOpen = ref(false)
const newChannelName = ref('')
const isPrivateChannel = ref(false)

const openCreateChannelDialog = () => {
  isCreateChannelOpen.value = true
}

const createChannel = async () => {
  try {
    await store.dispatch('channels/join', {
      channel: newChannelName.value,
      isPrivate: isPrivateChannel.value
    })

    isCreateChannelOpen.value = false
    newChannelName.value = ''
    isPrivateChannel.value = false

  } catch (error) {
    showNotification('Failed to create channel', 'negative')
  }
}

const leaveChannel = async (channel: string) => {
  try {
    await store.dispatch('channels/leaveChannel', channel)
    showNotification('Left channel successfully', 'positive')
  } catch (error) {
    showNotification('Failed to leave channel', 'negative')
  }
}

const logout = async () => {
  try {
    channels.value.forEach((channel: string) => {
      ChannelService.closeConnection(channel);
    });
    
    await store.dispatch('auth/logout')
    router.push({ name: 'login' })
  } catch (error) {
    showNotification('Failed to logout', 'negative')
  }
}

// Channel management
const isPrivate = computed(() => {
  if (!selectedChannel.value) return false
  return store.state.channels.isPrivate[selectedChannel.value] ? true : false
})

const memberCount = computed(() => {
  return store.state.channels.members[selectedChannel.value]?.length || 0
})

const currentUser = store.state.auth.user

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

// User state management
const userState = ref<UserState>('online')

const setUserStatus = (status: UserState) => {
  userState.value = status
  activityService.updateUserState(status)

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

const getStateIcon = computed(() => ({
  online: 'check_circle',
  offline: 'remove_circle',
  dnd: 'do_not_disturb'
}[userState.value] || 'help'))

const getStateColor = computed(() => ({
  online: 'positive',
  offline: 'grey',
  dnd: 'warning'
}[userState.value] || 'grey'))

const getStateLabel = computed(() => ({
  online: 'Available',
  offline: 'Offline',
  dnd: 'Do Not Disturb'
}[userState.value] || 'Unknown'))

// UI state
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)
const searchQuery = ref('')
const MessageMention = ref(false)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const toggleRightDrawer = () => {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

const toggleMentionOnly = () => {
  MessageMention.value = !MessageMention.value
}

watch(() => store.state.channels.pendingNotification, (notification) => {
    if (notification) {
        const { channel, message } = notification
        console.log('Your current log state:', userState)
        
        // Only show notification if not in DND mode
        if (userState.value !== 'dnd') {
            showNotification(
                `${message.author.nickname}: ${truncateText(message.content)}`,
                'info',
                5000,
                channel
            )
        }
    }
})

// Modify your existing showNotification function
const showNotification = (
  message: string, 
  type: string = 'info', 
  timeout: number = 5000,
  channelName?: string
) => {
  const notifyOptions: QNotifyCreateOptions = {
    message,
    position: 'top-right',
    color: type,
    timeout,
    actions: [
      { 
        label: channelName ? 'Open' : 'Dismiss',
        color: 'white',
        handler: () => {
          if (channelName) {
            selectChannel(channelName)
          }
        }
      }
    ],
    classes: 'notification-message sf-pro-500'
  }
  $q.notify(notifyOptions)
}

// Utility functions
const truncateText = (text: string): string => {
  const maxTextLength = 18
  return text.length > maxTextLength ? text.substring(0, maxTextLength) + '...' : text
}

// Initialization
const initializeChannels = async () => {
  try {
    await ChannelService.loadChannels()
    const currentChannels = channels.value

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
    activityService.updateUserState('online')
  } catch (error) {
    showNotification('Error initializing channels', 'error')
  }
})
</script>

<style scoped>

.message-header .sender {
  margin-right: 10px;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 40px 0;
  position: relative;
}

.date-divider span {
  padding: 0 10px;
  margin-bottom: 20px;
  font-weight: bold;
  color: grey;
}

.date-divider hr {
  position: absolute;
  width: 100%;
  top: 50%;
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.5);
}

.newest-channel {
  border-left: 4px solid #1e6bff;
  background: linear-gradient(90deg, rgb(24, 88, 209) 0%, rgba(33,186,69,0) 100%);
}

.newest-channel:hover {
  background: linear-gradient(90deg, rgb(24, 88, 209) 0%, rgba(33,186,69,0) 100%);
}

.picked {
  background: rgba(255, 255, 255, 0.1); /* Light background effect */
}


</style>
