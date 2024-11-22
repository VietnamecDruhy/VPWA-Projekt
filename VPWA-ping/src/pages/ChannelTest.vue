<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStore } from 'src/store'

const store = useStore()
const messages = computed(() => store.getters['channels/currentMessages'] || [])

onMounted(async () => {
  store.commit('channels/SET_ACTIVE', 'general')
  await store.dispatch('channels/join', 'general')
})
</script>

<template>
  <div>
    <h3>Active Channel: {{ store.state.channels.active }}</h3>
    <div v-if="messages.length">
      <h3>Messages:</h3>
      <pre>{{ messages }}</pre>
    </div>
    <div v-else>No messages in current channel</div>
  </div>
</template>