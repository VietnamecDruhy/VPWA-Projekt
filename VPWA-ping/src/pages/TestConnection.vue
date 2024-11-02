// src/pages/TestConnection.ts
<template>
  <q-page class="q-pa-md">
    <q-card class="my-card">
      <q-card-section>
        <div class="text-h6">Backend Connection Test</div>
      </q-card-section>

      <q-card-section>
        <q-btn 
          color="primary"
          label="Test Connection"
          @click="testConnection"
          :loading="loading"
        />

        <div v-if="response" class="q-mt-md">
          <q-banner class="bg-positive text-white">
            Connection Successful!
            <div class="q-mt-sm">
              Message: {{ response.message }}
              <br>
              Timestamp: {{ response.timestamp }}
            </div>
          </q-banner>
        </div>

        <div v-if="error" class="q-mt-md">
          <q-banner class="bg-negative text-white">
            {{ error }}
          </q-banner>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { api } from 'boot/axios';

interface ApiResponse {
  status: string;
  message: string;
  timestamp: string;
}

export default defineComponent({
  name: 'TestConnection',
  setup() {
    const response = ref<ApiResponse | null>(null);
    const error = ref<string | null>(null);
    const loading = ref(false);

    const testConnection = async (): Promise<void> => {
      loading.value = true;
      error.value = null;
      response.value = null;

      try {
        const result = await api.get<ApiResponse>('/api/test-connection');
        response.value = result.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to connect to backend';
      } finally {
        loading.value = false;
      }
    };

    return {
      testConnection,
      response,
      error,
      loading
    };
  }
});
</script>