<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()

function cycleTheme() {
  if (themeStore.mode === 'system') {
    themeStore.setMode('light')
  } else if (themeStore.mode === 'light') {
    themeStore.setMode('dark')
  } else {
    themeStore.setMode('system')
  }
}
</script>

<template>
  <button
    type="button"
    @click="cycleTheme"
    class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm"
    :title="`Current theme: ${themeStore.mode}. Click to change.`"
    aria-label="Toggle display theme"
  >
    <!-- System Icon -->
    <span v-if="themeStore.mode === 'system'" class="flex items-center gap-1.5">
      <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span class="text-xs font-semibold">Auto</span>
    </span>

    <!-- Light Icon -->
    <span v-else-if="themeStore.mode === 'light'" class="flex items-center gap-1.5">
      <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <span class="text-xs font-semibold">Light</span>
    </span>

    <!-- Dark Icon -->
    <span v-else class="flex items-center gap-1.5">
      <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <span class="text-xs font-semibold">Dark</span>
    </span>
  </button>
</template>
