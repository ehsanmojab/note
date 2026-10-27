<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const totpCode = ref('')
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both your email and password.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  const { error } = await authStore.login(email.value, password.value)
  isSubmitting.value = false

  if (error) {
    errorMessage.value = error
    return
  }

  if (authStore.isAuthenticated) {
    router.push({ name: 'notes' })
  }
}

async function handleVerifyMfa() {
  if (!totpCode.value || totpCode.value.length < 6) {
    errorMessage.value = 'Please enter the 6-digit authentication code.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  const { error } = await authStore.verifyMfa(totpCode.value)
  isSubmitting.value = false

  if (error) {
    errorMessage.value = error
    return
  }

  if (authStore.isAuthenticated) {
    router.push({ name: 'notes' })
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 transition-colors">
    <!-- Top Right Theme Toggle -->
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md px-4">
      <div class="flex justify-center mb-3">
        <div class="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
      <h1 class="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        Secure Notes
      </h1>
      <p class="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
        Personal private encrypted cloud notes
      </p>
    </div>

    <div class="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <div class="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-200 dark:border-gray-800">
        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2"
        >
          <svg class="w-5 h-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- MFA TOTP Verification View -->
        <form v-if="authStore.mfaRequired" @submit.prevent="handleVerifyMfa" class="space-y-5">
          <div>
            <label for="totp" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Two-Factor Authentication Code
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              id="totp"
              v-model="totpCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              required
              placeholder="123456"
              class="w-full min-h-[44px] text-center text-2xl tracking-widest font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full min-h-[44px] flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Verify & Enter</span>
          </button>
        </form>

        <!-- Standard Password Login View -->
        <form v-else @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                class="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full min-h-[44px] flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Sign in</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
