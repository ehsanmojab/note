<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotesStore } from '../stores/notes'
import { supabase } from '../lib/supabase'
import NoteList from '../components/NoteList.vue'
import NoteEditor from '../components/NoteEditor.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const authStore = useAuthStore()
const notesStore = useNotesStore()

// On mobile (< 768px), controls whether the editor is visible or the list
const showEditorOnMobile = ref(false)

// MFA Enrolment modal state
const isMfaModalOpen = ref(false)
const mfaStep = ref<'initial' | 'enrolling' | 'verified'>('initial')
const mfaQrCode = ref<string | null>(null)
const mfaSecret = ref<string | null>(null)
const mfaFactorId = ref<string | null>(null)
const mfaCodeInput = ref('')
const mfaError = ref<string | null>(null)
const mfaIsLoading = ref(false)

const userEmail = computed(() => authStore.user?.email || 'Owner')

onMounted(async () => {
  await notesStore.fetchNotes()
  // Select first note if available on desktop
  if (notesStore.notes.length > 0 && !notesStore.activeNoteId) {
    notesStore.activeNoteId = notesStore.notes[0].id
  }
})

function onSelectNote(_id: string) {
  showEditorOnMobile.value = true
}

function onBackToList() {
  showEditorOnMobile.value = false
}

async function handleLogout() {
  notesStore.clear()
  await authStore.logout()
  router.push({ name: 'login' })
}

// Step E: TOTP MFA Enrolment flow
async function startMfaEnrolment() {
  mfaIsLoading.value = true
  mfaError.value = null
  isMfaModalOpen.value = true

  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'SecureNotes App',
    })

    if (error) {
      mfaError.value = error.message
      mfaStep.value = 'initial'
      return
    }

    mfaFactorId.value = data.id
    mfaSecret.value = data.totp.secret
    mfaQrCode.value = data.totp.qr_code
    mfaStep.value = 'enrolling'
  } catch {
    mfaError.value = 'Failed to initiate MFA enrollment.'
  } finally {
    mfaIsLoading.value = false
  }
}

async function verifyEnrolmentCode() {
  if (!mfaFactorId.value || !mfaCodeInput.value) {
    mfaError.value = 'Please enter the 6-digit verification code.'
    return
  }

  mfaIsLoading.value = true
  mfaError.value = null

  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId.value,
      code: mfaCodeInput.value.trim(),
    })

    if (error) {
      mfaError.value = error.message
      return
    }

    mfaStep.value = 'verified'
  } catch {
    mfaError.value = 'Failed to verify MFA code.'
  } finally {
    mfaIsLoading.value = false
  }
}

function closeMfaModal() {
  isMfaModalOpen.value = false
  mfaStep.value = 'initial'
  mfaCodeInput.value = ''
  mfaError.value = null
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
    <!-- Top Global Header -->
    <header class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between shrink-0 z-10">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          N
        </div>
        <div>
          <h1 class="text-sm font-bold text-gray-900 dark:text-gray-100">Secure Notes</h1>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-xs">
            {{ userEmail }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Security / MFA Button -->
        <button
          type="button"
          @click="startMfaEnrolment"
          class="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          title="Setup Two-Factor Authentication"
        >
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="hidden sm:inline">2FA (MFA)</span>
        </button>

        <!-- Theme Toggle -->
        <ThemeToggle />

        <!-- Logout Button -->
        <button
          type="button"
          @click="handleLogout"
          class="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
          aria-label="Sign out"
        >
          <svg class="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace Container -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Notes Sidebar (Width 320px on desktop; full screen on mobile when editor is hidden) -->
      <aside
        class="w-full md:w-80 lg:w-96 shrink-0 h-full transition-all duration-200 z-0"
        :class="[
          showEditorOnMobile ? 'hidden md:block' : 'block'
        ]"
      >
        <NoteList @select-note="onSelectNote" />
      </aside>

      <!-- Note Editor Pane (Full width on mobile when editor is visible; flex-1 on desktop) -->
      <main
        class="flex-1 h-full overflow-hidden"
        :class="[
          showEditorOnMobile ? 'block' : 'hidden md:block'
        ]"
      >
        <NoteEditor
          v-if="notesStore.activeNoteId"
          :note-id="notesStore.activeNoteId"
          @back="onBackToList"
        />
        <div
          v-else
          class="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500"
        >
          <div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4 text-gray-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-base font-medium text-gray-700 dark:text-gray-300">No note selected</p>
          <p class="text-xs text-gray-500 mt-1">Select a note from the list or create a new one.</p>
        </div>
      </main>
    </div>

    <!-- MFA Enrolment Modal (Step E) -->
    <div
      v-if="isMfaModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfa-modal-title"
    >
      <div class="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 id="mfa-modal-title" class="text-base font-bold text-gray-900 dark:text-gray-100">
            Two-Factor Authentication (TOTP)
          </h2>
          <button
            type="button"
            @click="closeMfaModal"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="mfaError" class="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          {{ mfaError }}
        </div>

        <!-- Enrolling View -->
        <div v-if="mfaStep === 'enrolling'" class="space-y-4">
          <p class="text-xs text-gray-600 dark:text-gray-300">
            Scan this QR code with your authenticator app (Google Authenticator, 1Password, Bitwarden, etc.):
          </p>

          <!-- SVG QR Code Display (Safe rendering without innerHTML) -->
          <div v-if="mfaQrCode" class="flex justify-center p-4 bg-white rounded-xl shadow-inner border border-gray-200">
            <!-- Supabase returns data:image/svg+xml;utf-8,... which can be safely displayed via standard img tag -->
            <img :src="mfaQrCode" alt="MFA QR Code" class="w-48 h-48" />
          </div>

          <div v-if="mfaSecret" class="text-center">
            <p class="text-[11px] text-gray-500 mb-1">Manual entry key:</p>
            <code class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded select-all text-gray-800 dark:text-gray-200">
              {{ mfaSecret }}
            </code>
          </div>

          <div>
            <label for="mfa-verify-code" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Enter 6-digit code to verify:
            </label>
            <input
              id="mfa-verify-code"
              v-model="mfaCodeInput"
              type="text"
              maxlength="6"
              inputmode="numeric"
              placeholder="123456"
              class="w-full min-h-[44px] text-center text-xl font-mono tracking-widest rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="closeMfaModal"
              class="min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="mfaIsLoading || mfaCodeInput.length < 6"
              @click="verifyEnrolmentCode"
              class="min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              Verify & Enable
            </button>
          </div>
        </div>

        <!-- Verified Success View -->
        <div v-else-if="mfaStep === 'verified'" class="space-y-4 text-center py-4">
          <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">
            Two-Factor Authentication Enrolled!
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Your account is now secured with TOTP. When you log in, you will be prompted for your 6-digit code.
          </p>
          <div class="pt-2">
            <button
              type="button"
              @click="closeMfaModal"
              class="min-h-[44px] w-full px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
