import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, type Note } from '../lib/supabase'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

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
    // If not JSON, treat as raw text
    return content
  }
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const activeNoteId = ref<string | null>(null)
  const searchQuery = ref('')
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const saveStatus = ref<SaveStatus>('saved')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const activeNote = computed(() => {
    if (!activeNoteId.value) return null
    return notes.value.find((n) => n.id === activeNoteId.value) || null
  })

  // Filter notes client-side on title and extracted plain text from content
  const filteredNotes = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return notes.value

    return notes.value.filter((note) => {
      const matchTitle = note.title.toLowerCase().includes(query)
      if (matchTitle) return true

      const plainContent = extractPlainTextFromTiptapJson(note.content).toLowerCase()
      return plainContent.includes(query)
    })
  })

  // Fetch all notes for authenticated user, newest updated first
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

      // If active note is deleted or not set, select newest note on desktop
      if (activeNoteId.value && !notes.value.some((n) => n.id === activeNoteId.value)) {
        activeNoteId.value = notes.value[0]?.id || null
      }
    } catch {
      errorMessage.value = 'An unexpected error occurred while fetching notes.'
    } finally {
      isLoading.value = false
    }
  }

  // Create a new empty note
  async function createNote(): Promise<Note | null> {
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

  // Debounced update for title and content (800ms)
  function scheduleAutosave(noteId: string, title: string, contentJson: string) {
    saveStatus.value = 'unsaved'

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      await saveNote(noteId, title, contentJson)
    }, 800)
  }

  // Direct save execution
  async function saveNote(noteId: string, title: string, contentJson: string) {
    // Enforce constraints
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

      // Update local state and sort order
      const index = notes.value.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        notes.value[index] = data
        // Move to top of list if updated
        const [updatedNote] = notes.value.splice(index, 1)
        notes.value.unshift(updatedNote)
      }

      saveStatus.value = 'saved'
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'Network error while saving note.'
    }
  }

  // Delete note with confirmation
  async function deleteNote(noteId: string): Promise<boolean> {
    saveStatus.value = 'saving'
    errorMessage.value = null

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId)

      if (error) {
        saveStatus.value = 'error'
        errorMessage.value = 'Failed to delete note.'
        return false
      }

      notes.value = notes.value.filter((n) => n.id !== noteId)

      if (activeNoteId.value === noteId) {
        activeNoteId.value = notes.value[0]?.id || null
      }

      saveStatus.value = 'saved'
      return true
    } catch {
      saveStatus.value = 'error'
      errorMessage.value = 'An unexpected error occurred while deleting note.'
      return false
    }
  }

  // Clear memory on logout
  function clear() {
    notes.value = []
    activeNoteId.value = null
    searchQuery.value = ''
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
    filteredNotes,
    isLoading,
    errorMessage,
    saveStatus,
    fetchNotes,
    createNote,
    scheduleAutosave,
    saveNote,
    deleteNote,
    clear,
  }
})
