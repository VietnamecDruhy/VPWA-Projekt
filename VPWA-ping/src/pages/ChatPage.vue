<template>
  <q-layout view="hHh LpR lFf" class="full-height">
    <!-- Navbar -->
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="q-pa-none sf-pro-700" style="text-align: center;">
          {{ currentChannel.name }} {{ currentChannel.isPublic ? '🌍' : '🔒' }}
        </q-toolbar-title>

        <q-btn dense flat round icon="settings" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer -->
    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered class="bg-dark sf-pro-600">
      <q-input
        dense
        debounce="300"
        placeholder="Search..."
        v-model="searchQuery"
        class="search-input q-ma-md"
        rounded
        outlined
        clearable
        bg-color="white"
      >
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-list bordered>

        <!-- Create Chat Button -->
        <q-item clickable v-ripple @click="openCreateChatDialog" class="text-white">
          <q-item-section avatar>
            <q-icon name="group_add" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Create Chat</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Create Chat Dialog -->
        <q-dialog v-model="isDialogOpen">
          <q-card dark flat style="min-width: 300px;">
            <q-card-section>
              <div class="text-h6">Create New Chat</div>
            </q-card-section>

            <q-card-section>
              <q-input dark
                v-model="newChatName"
                label="Chat Name"
                placeholder="Enter chat name"
                dense
                clearable
              />
              <q-toggle
                v-model="isPrivateChat"
                label="Private Chat"
                color="primary"
                class="q-mt-md"
              />
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat label="Cancel" color="primary" @click="isDialogOpen = false" />
              <q-btn label="Create" color="primary" @click="createChat" :disable="!newChatName.trim()" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <q-item v-for="group in groups" :key="group.id" class="text-white sf-pro-600" clickable v-ripple>
          <q-item-section avatar>
            <q-avatar color="secondary" text-color="white" class="q-mb-xs sf-pro-400 inset-shadow-down">
              {{ group.name.charAt(0).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ truncateText(group.name) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat round dense icon="sms" color="white" @click="sendMessage" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Right Drawer -->
    <q-drawer
    show-if-above
    v-model="rightDrawerOpen"
    side="right"
    bordered
    class="bg-dark"
    >
      <q-list class="q-pa-md">
        <div class="text-center q-mt-lg">
          <q-avatar size="150px" class="q-mb-sm">
            <img src="https://cdn.quasar.dev/img/boy-avatar.png" />
          </q-avatar>
          <q-item-label header class="text-white text-h6 q-mb-md">{{currentUser.name}}</q-item-label>
        </div>

        <q-item class="q-mb-xs">
          <q-item-section avatar>
            <q-icon
              :name="currentUser.state === 'online' ? 'check_circle' : currentUser.state === 'dnd' ? 'do_not_disturb' : 'remove_circle'" color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">My status</q-item-label>
            <q-item-label caption class="text-grey-5">
              {{ currentUser.state}}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item class="q-mb-xs">
          <q-item-section avatar>
            <q-icon :name="currentChannel.isPublic ? 'public' : 'lock'" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">{{ currentChannel.name }}</q-item-label>
            <q-item-label caption class="text-grey-5">
              {{ currentChannel.isPublic ? 'Public' : 'Private' }} Channel
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section avatar>
            <q-icon name="group" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">{{ currentChannel.memberCount }} members</q-item-label>
          </q-item-section>
        </q-item>


        <q-separator color="grey-7" class="q-my-md" />

        <q-item-label header class="text-white q-mb-md">Settings</q-item-label>

        <q-item clickable v-ripple class="q-mb-sm">
          <q-item-section avatar>
            <q-icon name="person" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Profile</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="toggleMentionOnly" class="q-mb-sm">
          <q-item-section avatar>
            <q-icon name="bedtime" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Mention Only</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="MessageMention" color="primary" keep-color/>
          </q-item-section>
        </q-item>

        <!-- Collapsible notification settings list -->
        <q-expansion-item
          v-model="notificationSettingsOpen"
          icon="notifications"
          header-class="text-white dark"
          label="Notification"
          dense
          expand-separator
        >
          <q-list>
            <q-item clickable v-ripple @click="setUserStatus('online')">
              <q-item-section>
                <q-item-label class="text-white">online</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="setUserStatus('offline')">
              <q-item-section>
                <q-item-label class="text-white">offline</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="setUserStatus('dnd')">
              <q-item-section>
                <q-item-label class="text-white">dnd</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>

        <div class="row justify-center">
          <q-btn
            color="primary"
            label="Logout"
            class="q-mt-md"
            @click="logout"
          />
        </div>
      </q-list>
    </q-drawer>

    <!-- Main Content -->
      <MainContent />

  </q-layout>
</template>

<script lang="ts">
import ChatPage from '../utils/ChatPageLogic'
export default ChatPage

</script>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

}

.me.chat-message{
  align-items: flex-end;
}

.message-header .sender {
  margin-right: 10px; /* Add gap between sender and timestamp */
}

.message-header{
  padding-left: 10px; /* Add gap between sender and timestamp */
  padding-right: 10px;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 40px 0; /* Adds vertical space around the divider */
  position: relative;
}

.date-divider span {
  padding: 0 10px;
  margin-bottom: 20px;
  font-weight: bold;
  color: grey; /* Grey font for the date */
}

.date-divider hr {
  position: absolute;
  width: 100%;
  top: 50%;
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.5); /* Slightly transparent grey line */
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
  height: 24px; /* Adjust this value based on your design needs */
  margin-bottom: 8px; /* Add some space between the typing indicator and the input */
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
