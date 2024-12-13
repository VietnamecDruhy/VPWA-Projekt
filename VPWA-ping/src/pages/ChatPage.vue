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
          <q-input v-model="newChannelName" label="Channel Name" dense dark outlined :rules="[
            val => !!val || 'Channel name is required',
            val => val.length <= 20 || 'Channel name must be 20 characters or less',
            val => !val.includes(' ') || 'Channel name cannot contain spaces'
          ]" />

          <q-toggle v-model="isPrivateChannel" label="Private Channel" class="q-mt-md" />

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
        <q-item v-for="(channel, index) in channels" :key="index" class="text-white sf-pro-600 channel-item" clickable
          v-ripple @click="selectChannel(channel)" :class="{
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
        <q-item v-if="memberCount">
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
        <q-expansion-item icon="mood" label="Status" header-class="text-white" expand-separator>
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
      <ChatComponent :active-channel="selectedChannel" :user-state="userState" />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import ChatComponent from '../components/ChatComponent.vue';
import { ref, onMounted, computed, watch } from 'vue'
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

// log out
const logout = async () => {
  try {
    channels.value.forEach((channel: string) => {
      ChannelService.closeConnection(channel);
    });

    activityService.updateUserState('offline');

    // 4. Clear all store state
    await store.dispatch('auth/logout');

    // 5. Navigate to login page
    router.push({ name: 'login' });

  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Failed to logout', 'negative');
  }
}

// Channel management
const isPrivate = computed(() => {
  return store.getters['channels/isPrivate'](selectedChannel.value)
})

const memberCount = computed(() => {
  if (selectedChannel.value === 'general') {
    return null;
  }
  return store.getters['channels/memberCount'](selectedChannel.value);
});

// current user
const currentUser = store.state.auth.user

const channels = computed(() => {
  const channelList = store.getters['channels/joinedChannels'] || []
  if (channelList.length > 1) {
    const lastChannel = channelList[channelList.length - 1]
    return [lastChannel, ...channelList.slice(0, -1)]
  }
  return channelList
})

// current channel in left drawer
const selectedChannel = ref<string>('general')

const selectChannel = (channel: string) => {
  store.commit('channels/SET_ACTIVE', channel)

  selectedChannel.value = channel
}

// User state management
const userState = ref<UserState>('online')

const setUserStatus = (status: UserState) => {
  userState.value = status
  activityService.updateUserState(status)
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

// notifications
import {
  shouldShowNotification,
  createNotificationContent,
  showBrowserNotification,
  showInAppNotification,
  checkNotificationPermission,
  requestNotificationPermission,
} from 'src/utils';

const notificationPermission = ref(checkNotificationPermission());

watch(() => store.state.channels.pendingNotification, async (notification) => {
  if (!notification) return;

  const { channel, message } = notification;

  const shouldNotify = shouldShowNotification(
    message,
    MessageMention.value,
    currentUser?.nickname || '',
    userState.value
  );

  if (!shouldNotify) return;

  const content = createNotificationContent(
    message,
    channel,
    currentUser?.nickname || '',
    truncateText
  );

  // For browser notifications when app is not visible
  if (!$q.appVisible) {
    if (!notificationPermission.value.isGranted) {
      if (!notificationPermission.value.isDenied) {
        notificationPermission.value = await requestNotificationPermission();
      }
    }

    // Show browser notification if permitted
    if (notificationPermission.value.isGranted) {
      showBrowserNotification(content, channel, selectChannel);
    } else {
      if (channel !== store.state.channels.active) {
        showInAppNotification(content, channel, showNotification);
      }
    }
  } else {
    if (channel !== store.state.channels.active) {
      showInAppNotification(content, channel, showNotification);
    }
  }
});

const toggleMentionOnly = () => {
  MessageMention.value = !MessageMention.value
}

// initial channel and subsequent changes
watch(
  () => channels.value,
  (newChannels) => {
    if (!selectedChannel.value && newChannels.length > 0) {
      selectedChannel.value = newChannels[0];
      store.commit('channels/SET_ACTIVE', newChannels[0]);
    }

    else if (selectedChannel.value && !newChannels.includes(selectedChannel.value)) {
      selectedChannel.value = newChannels[0] || 'general';
      store.commit('channels/SET_ACTIVE', newChannels[0] || 'general');
    }

    else if (newChannels.length > 0 && selectedChannel.value !== newChannels[0]) {
      selectedChannel.value = newChannels[0];
      store.commit('channels/SET_ACTIVE', newChannels[0]);
    }
  },
  { immediate: true }
);

// errors
watch(() => store.state.channels.socketError, (error) => {
  if (!error) return;

  showNotification(
    error.message,
    error.type || 'negative'  // Default to negative if no type specified
  );

  // Clear the error after showing notification
  store.commit('channels/CLEAR_SOCKET_ERROR');
});

const showNotification = (
  message: string,
  type: string = 'info',
  timeout: number = 5000,
  channelName?: string
) => {
  const notifyOptions: QNotifyCreateOptions = {
    message,
    position: 'top',
    color: type,
    timeout,
    html: true, // Enable HTML content
    actions: [
      {
        label: channelName ? 'Open' : 'Dismiss',
        color: 'white',
        flat: true,
        handler: () => {
          if (channelName) {
            selectChannel(channelName)
          }
        }
      }
    ],
    classes: `notification-message bg-${type} sf-pro-500`,
    icon: getNotificationIcon(type),
  }
  $q.notify(notifyOptions)
}

const getNotificationIcon = (type: string): string => {
  const icons = {
    info: 'info',
    positive: 'check_circle',
    negative: 'error',
    warning: 'warning'
  }
  return icons[type as keyof typeof icons] || 'info'
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
  // Check for fresh login flag
  const isFreshLogin = localStorage.getItem('fresh_login') === 'true'
  if (isFreshLogin) {
    localStorage.removeItem('fresh_login')
    window.location.reload()
    return
  }

  try {
    notificationPermission.value = await requestNotificationPermission();
    await initializeChannels();
    activityService.updateUserState('online');
  } catch (error) {
    showNotification('Error initializing channels', 'error');
  }
});
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
  background: linear-gradient(90deg, rgb(24, 88, 209) 0%, rgba(33, 186, 69, 0) 100%);
}

.newest-channel:hover {
  background: linear-gradient(90deg, rgb(24, 88, 209) 0%, rgba(33, 186, 69, 0) 100%);
}

.picked {
  background: rgba(255, 255, 255, 0.1);
  /* Light background effect */
}

.notification-message {
  min-width: 300px;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 8px;
  animation: slideIn 0.3s ease-out;
}

.notification-message.bg-info {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  border-left: 4px solid #0D47A1;
}

.notification-message.bg-positive {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  border-left: 4px solid #1B5E20;
}

.notification-message.bg-negative {
  background: linear-gradient(135deg, #F44336, #D32F2F);
  border-left: 4px solid #B71C1C;
}

.notification-message.bg-warning {
  background: linear-gradient(135deg, #FFC107, #FFA000);
  border-left: 4px solid #FF6F00;
}

.notification-message .q-notification__message {
  font-size: 14px;
  line-height: 1.4;
  color: white;
  margin-bottom: 8px;
}

.notification-message .q-notification__actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.notification-message .q-btn {
  padding: 4px 12px;
  text-transform: none;
  font-weight: 500;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.notification-message .q-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

@keyframes slideIn {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
