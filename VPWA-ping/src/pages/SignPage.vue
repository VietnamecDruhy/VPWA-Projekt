<template>
  <q-page class="row justify-center items-center custom-bg">
    <div class="column q-pa-md">
      <div class="row q-col-gutter-md">
        <q-card bordered class="q-pa-lg q-card">
          <q-card-section>
            <q-form class="q-gutter-md" @submit="onSubmit">
              <div class="header-container">
                <h5 class="text-dark sf-pro-700 center">
                  {{ isSignUp ? 'Sign Up' : 'Sign In' }}
                </h5>
                <img src="/public/icons/ping.gif" alt="Ping Animation" class="ping-image" />
              </div>

              <!-- Name, Surname, Nickname for Sign Up -->
              <template v-if="isSignUp">
                <q-input v-model="form.firstName" dense clearable clear-icon="close" :clear-icon-props="{ tabindex: 0 }"
                  rounded standout label="Name">
                  <template v-slot:prepend>
                    <q-icon name="badge" />
                  </template>
                </q-input>

                <q-input v-model="form.lastName" dense clearable clear-icon="close" :clear-icon-props="{ tabindex: -1 }"
                  rounded standout label="Last Name">
                  <template v-slot:prepend>
                    <q-icon name="badge" />
                  </template>
                </q-input>

                <q-input v-model="form.nickname" dense clearable clear-icon="close" :clear-icon-props="{ tabindex: -1 }"
                  rounded standout label="Nickname" :rules="[
                    val => !val.includes(' ') || 'Nickname cannot contain spaces'
                  ]">
                  <template v-slot:prepend>
                    <q-icon name="tag" />
                  </template>
                </q-input>
              </template>

              <!-- Email Input -->
              <q-input v-model="credentials.email" type="email" dense clearable clear-icon="close"
                :clear-icon-props="{ tabindex: -1 }" rounded standout label="Email">
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <!-- Password Input -->
              <q-input v-model="credentials.password" :type="isPwd ? 'password' : 'text'" dense clearable
                clear-icon="close" :clear-icon-props="{ tabindex: -1 }" rounded standout label="Password">
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
                <template v-slot:append>
                  <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" tabindex="-1"
                    @click="togglePasswordVisibility" />
                </template>
              </q-input>

              <q-checkbox v-if="!isSignUp" v-model="credentials.remember" label="Remember me" dense />

              <!-- Confirm Password for Sign Up -->
              <q-input v-if="isSignUp" v-model="form.passwordConfirmation" :type="isPwd ? 'password' : 'text'" dense
                clearable clear-icon="close" :clear-icon-props="{ tabindex: -1 }" rounded standout
                label="Confirm Password">
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
              </q-input>

              <!-- Submit Button -->
              <q-card-actions class="q-px-md">
                <q-btn type="submit" rounded dense color="primary" size="lg" class="full-width sf-pro-600"
                  :label="isSignUp ? 'Sign Up' : 'Login'" />
              </q-card-actions>
            </q-form>
          </q-card-section>

          <!-- Toggle between Sign In and Sign Up -->
          <q-card-section class="text-center q-pa-none sf-pro-400">
            <p class="text-dark">
              <span @click="toggleForm" class="text-dark cursor-pointer sf-pro-600">
                {{ isSignUp ? 'Already registered? Sign in' : 'Not registered? Create an Account' }}
              </span>
            </p>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useStore } from 'src/store'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { QNotifyCreateOptions } from 'quasar'

const store = useStore()
const router = useRouter()
const $q = useQuasar()

// Reactive state
const isSignUp = ref(false)
const isPwd = ref(true)

const credentials = reactive({
  email: '',
  password: '',
  remember: false
})

const form = reactive({
  passwordConfirmation: '',
  firstName: '',
  lastName: '',
  nickname: ''
})

// Methods
const togglePasswordVisibility = () => {
  isPwd.value = !isPwd.value
}

const resetForm = () => {
  credentials.email = ''
  credentials.password = ''
  credentials.remember = false

  form.passwordConfirmation = ''
  form.firstName = ''
  form.lastName = ''
  form.nickname = ''
}

const toggleForm = () => {
  isSignUp.value = !isSignUp.value
  resetForm()
}

const showNotification = (message: string, type: string = 'info', timeout: number = 3000) => {
  const notifyOptions: QNotifyCreateOptions = {
    message,
    position: 'top',
    color: type,
    timeout,
    actions: [{ icon: 'close', color: 'white' }]
  }
  $q.notify(notifyOptions)
}

const onSubmit = async () => {
  try {
    if (isSignUp.value) {
      const registerData = {
        email: credentials.email,
        password: credentials.password,
        passwordConfirmation: form.passwordConfirmation,
        name: `${form.firstName} ${form.lastName}`,
        nickname: form.nickname
      }

      await store.dispatch('auth/register', registerData)
      isSignUp.value = false
    } else {
      await store.dispatch('auth/login', credentials)
      router.push({ name: 'home' })
    }
  } catch (error) {
    showNotification(
      isSignUp.value
        ? 'Registration failed. Please try again.'
        : 'Invalid email or password. Please try again.',
      'negative',
      3000
    )
  }
}

// Lifecycle
onMounted(async () => {
  const isAuthenticated = await store.dispatch('auth/check')
  if (isAuthenticated) {
    router.push({ name: 'home' })
  }
})
</script>

<style scoped>
.q-card {
  width: 350px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px #ffffff;
  border: white 1px solid;
}

@media (max-width: 600px) {
  .q-card {
    max-width: 300px;
  }
}

.custom-bg {
  background-image: url('src/css/bg.png');
  background-size: cover;
  background-position: center;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.ping-image {
  width: auto;
  height: 50px;
  margin-left: 10px;
}
</style>