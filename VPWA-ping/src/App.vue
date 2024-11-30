<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import ActivityService from 'src/services/ActivityService'
import { authManager } from 'src/services'

defineOptions({
  name: 'App'
});

onMounted(() => {
  console.log('App mounted')
  if (authManager.getToken()) {
    console.log('Connecting activity service')
    ActivityService.socket.connect()
  }

  authManager.onChange((token) => {
    console.log('Auth changed:', !!token)
    if (token) {
      ActivityService.socket.connect()
    } else {
      ActivityService.socket.disconnect()
    }
  })
})

onUnmounted(() => {
  ActivityService.socket.disconnect()
})
</script>
