<script setup lang="ts">
import { ref } from 'vue'
import { useNotesStore, extractPlainTextFromTiptapJson } from '../stores/notes'

const notesStore = useNotesStore()
const showEmptyBinModal = ref(false)

const emit = defineEmits<{
  (e: 'select-note', noteId: string): void
}>()

function selectNote(noteId: string) {
  notesStore.activeNoteId = noteId
  emit('select-note', noteId)
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function getSnippet(contentJson: string) {
  const text = extractPlainTextFromTiptapJson(contentJson)
  return text.trim() ? text.slice(0, 80) : 'No content'
}

async function confirmEmptyBin() {
  showEmptyBinModal.value = false
  await notesStore.emptyBin()
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- Tab Switcher (Notes vs Bin) -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <div class="grid grid-cols-2 gap-1.5 p-1 bg-gray-200/70 dark:bg-gray-800 rounded-lg text-xs font-semibold">
        <!-- Notes Tab -->
        <button
          type="button"
          @click="notesStore.setTab('notes')"
          class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md min-h-[38px] transition-colors focus:outline-none"
          :class="[
            notesStore.currentTab === 'notes'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Notes</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-800 font-mono">
            {{ notesStore.activeNotes.length }}
          </span>
        </button>

        <!-- Bin Tab -->
        <button
          type="button"
          @click="notesStore.setTab('bin')"
          class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md min-h-[38px] transition-colors focus:outline-none"
          :class="[
            notesStore.currentTab === 'bin'
              ? 'bg-white dark:bg-gray-700 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Bin</span>
          <span
            v-if="notesStore.binNotes.length > 0"
            class="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono"
          >
            {{ notesStore.binNotes.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Actions & Search Header -->
    <div class="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {{ notesStore.currentTab === 'notes' ? 'All Notes' : 'Recycle Bin' }}
          <span class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
            ({{ notesStore.filteredNotes.length }})
          </span>
        </h2>

        <!-- New Note button in Notes tab -->
        <button
          v-if="notesStore.currentTab === 'notes'"
          type="button"
          @click="notesStore.createNote()"
          class="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          aria-label="Create new note"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Note</span>
        </button>

        <!-- Empty Bin button in Bin tab -->
        <button
          v-else-if="notesStore.binNotes.length > 0"
          type="button"
          @click="showEmptyBinModal = true"
          class="inline-flex items-center gap-1 min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
          aria-label="Empty Bin"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Empty Bin</span>
        </button>
      </div>

      <!-- Search Box -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="notesStore.searchQuery"
          type="search"
          :placeholder="notesStore.currentTab === 'notes' ? 'Search notes...' : 'Search deleted notes...'"
          class="w-full min-h-[42px] pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        <button
          v-if="notesStore.searchQuery"
          type="button"
          @click="notesStore.searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Clear search"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Notes Scrollable List -->
    <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      <!-- Loading State -->
      <div v-if="notesStore.isLoading" class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <svg class="animate-spin w-5 h-5 mx-auto mb-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        Loading notes...
      </div>

      <!-- Empty State -->
      <div
        v-else-if="notesStore.filteredNotes.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm"
      >
        <template v-if="notesStore.searchQuery">
          <p class="font-medium text-gray-700 dark:text-gray-300">No notes found</p>
          <p class="text-xs mt-1">No notes match "{{ notesStore.searchQuery }}".</p>
        </template>
        <template v-else-if="notesStore.currentTab === 'notes'">
          <p class="font-medium text-gray-700 dark:text-gray-300">No notes yet</p>
          <p class="text-xs mt-1">Click "New Note" to create your first note.</p>
        </template>
        <template v-else>
          <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p class="font-medium text-gray-700 dark:text-gray-300">Bin is empty</p>
          <p class="text-xs mt-1">Notes you delete will stay here until permanently deleted.</p>
        </template>
      </div>

      <!-- Note Items -->
      <button
        v-for="note in notesStore.filteredNotes"
        :key="note.id"
        type="button"
        @click="selectNote(note.id)"
        class="w-full text-left p-3.5 sm:p-4 min-h-[56px] transition-colors focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800"
        :class="[
          notesStore.activeNoteId === note.id
            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-500 pl-3'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        ]"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <h3
            class="text-sm font-semibold truncate text-gray-900 dark:text-gray-100"
            :class="{ 'text-indigo-600 dark:text-indigo-400': notesStore.activeNoteId === note.id }"
          >
            {{ note.title || 'Untitled Note' }}
          </h3>
          <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {{ formatDate(note.updated_at) }}
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {{ getSnippet(note.content) }}
        </p>
      </button>
    </div>

    <!-- Empty Bin Confirmation Modal -->
    <div
      v-if="showEmptyBinModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">
          Empty the Bin?
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This will permanently delete all {{ notesStore.binNotes.length }} note(s) currently in the bin. This action cannot be undone.
        </p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showEmptyBinModal = false"
            class="min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmEmptyBin"
            class="min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
          >
            Yes, empty bin
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
