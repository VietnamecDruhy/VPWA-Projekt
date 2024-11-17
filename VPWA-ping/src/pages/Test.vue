<template>
  <div class="q-pa-md">
    <h5>Channels for User 3 (Fero):</h5>
    <div v-if="loading">Loading channels...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div v-for="channelId in joinedChannels" :key="channelId" class="q-pa-sm">
        <div class="text-body1">
          Channel ID: {{ channelId }}
          <q-btn 
            label="Join Channel" 
            color="primary" 
            @click="joinChannel(channelId)"
            :loading="joiningChannels[channelId]"
          />
        </div>
        <div v-if="store.state.channels.messages[channelId]">
          Messages: {{ store.state.channels.messages[channelId].length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { computed } from 'vue';

export default defineComponent({
  name: 'TestPage',
  setup() {
    const store = useStore();
    const error = ref<string | null>(null);
    const joiningChannels = ref<{[key: number]: boolean}>({});
    const userId = 3; 

    // Getters
    const joinedChannels = computed(() => store.getters['channels/joinedChannels']);
    const loading = computed(() => store.state.channels.loading);

    onMounted(async () => {
    console.log('Component mounted, trying to load channels');
    try {
        await store.dispatch('channels/loadUserChannels', userId);
        console.log('Channels loaded successfully');
    } catch (err) {
        console.log('Error loading channels:', err);
        error.value = 'Failed to load user channels';
    }
      });

      const joinChannel = async (channelId: number) => {
          console.log('Attempting to join channel:', channelId);
          joiningChannels.value[channelId] = true;
          try {
              await store.dispatch('channels/join', channelId);
              console.log('Successfully joined channel:', channelId);
          } catch (err) {
              console.log('Error joining channel:', err);
              error.value = 'Failed to join channel';
          } finally {
              joiningChannels.value[channelId] = false;
          }
      };

    return {
      joinedChannels,
      loading,
      error,
      joinChannel,
      joiningChannels,
      store // Exposing store for debugging purposes
    };
  }
});
</script>