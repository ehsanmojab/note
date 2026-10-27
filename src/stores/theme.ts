import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export type ThemeMode = 'system' | 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const preferredDark = usePreferredDark()
  const mode = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'system')

  const isDark = computed(() => {
    if (mode.value === 'dark') return true
    if (mode.value === 'light') return false
    return preferredDark.value
  })

  function applyTheme(dark: boolean) {
    if (typeof document !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem('theme', newMode)
    applyTheme(isDark.value)
  }

  watch(isDark, (val) => {
    applyTheme(val)
  }, { immediate: true })

  onMounted(() => {
    applyTheme(isDark.value)
  })

  return {
    mode,
    isDark,
    setMode,
  }
})
