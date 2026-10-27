<script setup lang="ts">
import { useNotesStore, extractPlainTextFromTiptapJson } from '../stores/notes'

const notesStore = useNotesStore()

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
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- List Header & Search -->
    <div class="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">
          Notes
          <span class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
            ({{ notesStore.filteredNotes.length }})
          </span>
        </h2>
        <button
          type="button"
          @click="notesStore.createNote()"
          class="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          aria-label="Create new note"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Note</span>
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
          placeholder="Search notes..."
          class="w-full min-h-[44px] pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
        <button
          v-if="notesStore.searchQuery"
          type="button"
          @click="notesStore.searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Clear search"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <template v-else>
          <p class="font-medium text-gray-700 dark:text-gray-300">No notes yet</p>
          <p class="text-xs mt-1">Click "New Note" to create your first note.</p>
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
  </div>
</template>
