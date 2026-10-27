import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const isInitializing = ref(true)
  const mfaRequired = ref(false)
  const mfaFactorId = ref<string | null>(null)

  const isAuthenticated = computed(() => {
    return !!session.value && !mfaRequired.value
  })

  // Initialize auth session and listen for state transitions
  async function init() {
    isInitializing.value = true

    if (!isSupabaseConfigured) {
      isInitializing.value = false
      return
    }

    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null

      if (session.value) {
        await checkMfaStatus()
      }
    } catch {
      session.value = null
      user.value = null
    } finally {
      isInitializing.value = false
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null

      if (newSession) {
        await checkMfaStatus()
      } else {
        mfaRequired.value = false
        mfaFactorId.value = null
      }
    })
  }

  // Check if TOTP factor is enrolled and needs verification (AAL1 -> AAL2)
  async function checkMfaStatus() {
    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError) return

      if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors()
        if (factorError) return

        const verifiedTotp = factors.totp.find((f) => f.status === 'verified')
        if (verifiedTotp) {
          mfaRequired.value = true
          mfaFactorId.value = verifiedTotp.id
          return
        }
      }

      mfaRequired.value = false
      mfaFactorId.value = null
    } catch {
      mfaRequired.value = false
    }
  }

  // Password Login (Owner only)
  async function login(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        return { error: error.message }
      }

      session.value = data.session
      user.value = data.user

      await checkMfaStatus()
      return { error: null }
    } catch {
      return { error: 'Authentication failed. Please check your credentials.' }
    }
  }

  // Verify TOTP 6-digit challenge code
  async function verifyMfa(code: string): Promise<{ error: string | null }> {
    if (!mfaFactorId.value) {
      return { error: 'No MFA factor found.' }
    }

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId.value,
        code: code.trim(),
      })

      if (error) {
        return { error: error.message }
      }

      mfaRequired.value = false
      mfaFactorId.value = null

      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null

      return { error: null }
    } catch {
      return { error: 'Failed to verify MFA code.' }
    }
  }

  // Sign out and clear session
  async function logout() {
    try {
      await supabase.auth.signOut()
    } finally {
      session.value = null
      user.value = null
      mfaRequired.value = false
      mfaFactorId.value = null
    }
  }

  return {
    user,
    session,
    isInitializing,
    mfaRequired,
    isAuthenticated,
    init,
    login,
    verifyMfa,
    logout,
  }
})
