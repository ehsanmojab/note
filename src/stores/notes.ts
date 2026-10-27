import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, type Note } from '../lib/supabase'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
export type TabType = 'notes' | 'bin'

// Recursively extract plain text from Tiptap JSON tree for fast client-side searching
export function extractPlainTextFromTiptapJson(content: string): string {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    const textPieces: string[] = []

    function walk(node: unknown) {
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (typeof record.text === 'string') {
        textPieces.push(record.text)
      }
      if (Array.isArray(record.content)) {
        for (const child of record.content) {
          walk(child)
        }
      }
    }

    walk(parsed)
    return textPieces.join(' ')
  } catch {
    return content
  }
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const activeNoteId = ref<string | null>(null)
  const searchQuery = ref('')
  const currentTab = ref<TabType>('notes')
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const saveStatus = ref<SaveStatus>('saved')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Active (non-deleted) notes
  const activeNotes = computed(() => {
    return notes.value.filter((n) => !n.is_deleted)
  })

  // Binned (soft-deleted) notes
  const binNotes = computed(() => {
    return notes.value.filter((n) => !!n.is_deleted)
  })

  // The active note object
  const activeNote = computed(() => {
    if (!activeNoteId.value) return null
    return notes.value.find((n) => n.id === activeNoteId.value) || null
  })

  // Notes filtered by current tab (All Notes vs Bin) and search query
  const filteredNotes = computed(() => {
    const sourceList = currentTab.value === 'notes' ? activeNotes.value : binNotes.value
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return sourceList

    return sourceList.filter((note) => {
      const matchTitle = note.title.toLowerCase().includes(query)
      if (matchTitle) return true

      const plainContent = extractPlainTextFromTiptapJson(note.content).toLowerCase()
      return plainContent.includes(query)
    })
  })

  // Switch between 'notes' and 'bin' tabs
  function setTab(tab: TabType) {
    currentTab.value = tab
    searchQuery.value = ''
    const targetList = tab === 'notes' ? activeNotes.value : binNotes.value
    if (!targetList.some((n) => n.id === activeNoteId.value)) {
      activeNoteId.value = targetList[0]?.id || null
    }
  }

  // Fetch all notes from Supabase
  async function fetchNotes() {
    isLoading.value = true
    errorMessage.value = null

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        errorMessage.value = 'Failed to load notes. Please check your connection.'
        return
      }

      notes.value = data || []

      // Select first active note if none selected
      if (!activeNoteId.value && activeNotes.value.length > 0) {
        activeNoteId.value = activeNotes.value[0].id
      }
    } catch {
      errorMessage.value = 'An unexpected error occurred while fetching notes.'
    } finally {
      isLoading.value = false
    }
  }

  // Create a new empty note
  async function createNote(): Promise<Note | null> {
    currentTab.value = 'notes'
    saveStatus.value = 'saving'
    errorMessage.value = null

    const defaultTiptapContent = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: 'Untitled Note',
          content: defaultTiptapContent,
          is_deleted: false,
        })
        .select()
        .single()

      if (error) {
        saveStatus.value = 'error'
        errorMessage.value = 'Failed to create note.'
        return null
      }

      notes.value.unshift(data)
      activeNoteId.value = data.id
      saveStatus.value = 'saved'
      return data
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'An unexpected error occurred while creating a note.'
      return null
    }
  }

  // Debounced autosave (800ms) - only runs if note is NOT in bin
  function scheduleAutosave(noteId: string, title: string, contentJson: string) {
    const note = notes.value.find((n) => n.id === noteId)
    if (note?.is_deleted) return

    saveStatus.value = 'unsaved'

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      await saveNote(noteId, title, contentJson)
    }, 800)
  }

  // Save note changes
  async function saveNote(noteId: string, title: string, contentJson: string) {
    const cleanTitle = title.slice(0, 200)
    if (contentJson.length > 100000) {
      saveStatus.value = 'error'
      errorMessage.value = 'Note content exceeds maximum allowed size (100,000 characters).'
      return
    }

    saveStatus.value = 'saving'

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: cleanTitle,
          content: contentJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single()

      if (error) {
        saveStatus.value = 'error'
        errorMessage.value = 'Error saving note changes.'
        return
      }

      const index = notes.value.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        notes.value[index] = data
        const [updatedNote] = notes.value.splice(index, 1)
        notes.value.unshift(updatedNote)
      }

      saveStatus.value = 'saved'
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'Network error while saving note.'
    }
  }

  // Move note to Bin (Soft delete)
  async function moveToBin(noteId: string): Promise<boolean> {
    saveStatus.value = 'saving'
    errorMessage.value = null

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single()

      if (error) {
        // If column does not exist yet in database, notify user
        if (error.message && error.message.includes('is_deleted')) {
          errorMessage.value = 'Database update needed: Please run `alter table public.notes add column if not exists is_deleted boolean not null default false;` in Supabase SQL Editor.'
        } else {
          errorMessage.value = 'Failed to move note to bin.'
        }
        saveStatus.value = 'error'
        return false
      }

      const index = notes.value.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        notes.value[index] = data
      }

      // Switch active note to next active note
      if (activeNoteId.value === noteId) {
        activeNoteId.value = activeNotes.value[0]?.id || null
      }

      saveStatus.value = 'saved'
      return true
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'Network error while moving note to bin.'
      return false
    }
  }

  // Restore note from Bin
  async function restoreNote(noteId: string): Promise<boolean> {
    saveStatus.value = 'saving'
    errorMessage.value = null

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single()

      if (error) {
        errorMessage.value = 'Failed to restore note.'
        saveStatus.value = 'error'
        return false
      }

      const index = notes.value.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        notes.value[index] = data
      }

      if (activeNoteId.value === noteId) {
        activeNoteId.value = binNotes.value[0]?.id || null
      }

      saveStatus.value = 'saved'
      return true
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'Network error while restoring note.'
      return false
    }
  }

  // Permanently delete note from database
  async function permanentlyDeleteNote(noteId: string): Promise<boolean> {
    saveStatus.value = 'saving'
    errorMessage.value = null

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId)

      if (error) {
        saveStatus.value = 'error'
        errorMessage.value = 'Failed to permanently delete note.'
        return false
      }

      notes.value = notes.value.filter((n) => n.id !== noteId)

      if (activeNoteId.value === noteId) {
        const currentList = currentTab.value === 'notes' ? activeNotes.value : binNotes.value
        activeNoteId.value = currentList[0]?.id || null
      }

      saveStatus.value = 'saved'
      return true
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'An unexpected error occurred while deleting note.'
      return false
    }
  }

  // Empty Bin (permanently delete all notes in bin)
  async function emptyBin(): Promise<boolean> {
    saveStatus.value = 'saving'
    errorMessage.value = null

    try {
      const { error } = await supabase.from('notes').delete().eq('is_deleted', true)

      if (error) {
        saveStatus.value = 'error'
        errorMessage.value = 'Failed to empty bin.'
        return false
      }

      notes.value = notes.value.filter((n) => !n.is_deleted)
      activeNoteId.value = null
      saveStatus.value = 'saved'
      return true
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'Network error while emptying bin.'
      return false
    }
  }

  // Clear memory on logout
  function clear() {
    notes.value = []
    activeNoteId.value = null
    searchQuery.value = ''
    currentTab.value = 'notes'
    errorMessage.value = null
    saveStatus.value = 'saved'
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return {
    notes,
    activeNoteId,
    activeNote,
    searchQuery,
    currentTab,
    activeNotes,
    binNotes,
    filteredNotes,
    isLoading,
    errorMessage,
    saveStatus,
    setTab,
    fetchNotes,
    createNote,
    scheduleAutosave,
    saveNote,
    moveToBin,
    restoreNote,
    permanentlyDeleteNote,
    emptyBin,
    clear,
  }
})
