<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { useNotesStore } from '../stores/notes'

const props = defineProps<{
  noteId: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const notesStore = useNotesStore()
const localTitle = ref('')
const deleteDialogOpen = ref(false)

// Initialize Tiptap editor with StarterKit
const editor = useEditor({
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 text-gray-900 dark:text-gray-100',
    },
  },
  onUpdate: ({ editor: ed }) => {
    if (!props.noteId) return
    const contentJson = JSON.stringify(ed.getJSON())
    notesStore.scheduleAutosave(props.noteId, localTitle.value, contentJson)
  },
})

// Synchronize editor content when active note changes
watch(
  () => props.noteId,
  (newId) => {
    if (!newId) return
    const note = notesStore.notes.find((n) => n.id === newId)
    if (!note) return

    localTitle.value = note.title || ''

    if (editor.value) {
      try {
        const parsed = JSON.parse(note.content)
        editor.value.commands.setContent(parsed, { emitUpdate: false })
      } catch {
        editor.value.commands.setContent(note.content || '', { emitUpdate: false })
      }
    }
  },
  { immediate: true }
)

// Watch title change and trigger autosave
function onTitleInput() {
  if (!props.noteId || !editor.value) return
  const contentJson = JSON.stringify(editor.value.getJSON())
  notesStore.scheduleAutosave(props.noteId, localTitle.value, contentJson)
}

// Confirmation and delete
async function confirmDelete() {
  deleteDialogOpen.value = false
  if (props.noteId) {
    const success = await notesStore.deleteNote(props.noteId)
    if (success) {
      emit('back')
    }
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Editor Header Toolbar -->
    <div class="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 backdrop-blur shrink-0 gap-2">
      <div class="flex items-center gap-2">
        <!-- Mobile Back Button -->
        <button
          type="button"
          @click="emit('back')"
          class="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Back to notes list"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Autosave Status Badge -->
        <div class="flex items-center gap-1.5 text-xs font-medium">
          <span
            v-if="notesStore.saveStatus === 'saved'"
            class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
          <span
            v-else-if="notesStore.saveStatus === 'saving'"
            class="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400"
          >
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Saving...
          </span>
          <span
            v-else-if="notesStore.saveStatus === 'unsaved'"
            class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"
          >
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Unsaved
          </span>
          <span
            v-else-if="notesStore.saveStatus === 'error'"
            class="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Save failed
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="deleteDialogOpen = true"
          class="inline-flex items-center gap-1 min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
          aria-label="Delete note"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>

    <!-- Title Input & Character Counter -->
    <div class="px-4 sm:px-8 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center justify-between gap-2">
        <input
          v-model="localTitle"
          type="text"
          maxlength="200"
          @input="onTitleInput"
          placeholder="Note title..."
          class="w-full text-xl sm:text-2xl font-bold bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
        />
        <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0 font-mono">
          {{ localTitle.length }}/200
        </span>
      </div>
    </div>

    <!-- Tiptap Formatting Toolbar -->
    <div
      v-if="editor"
      class="flex items-center gap-1 px-4 sm:px-8 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/40 overflow-x-auto text-xs"
    >
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 font-bold',
          editor.isActive('bold') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 italic',
          editor.isActive('italic') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 line-through',
          editor.isActive('strike') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Strikethrough"
      >
        S
      </button>
      <span class="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></span>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 font-bold',
          editor.isActive('heading', { level: 1 }) ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 font-bold',
          editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Heading 2"
      >
        H2
      </button>
      <span class="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></span>
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800',
          editor.isActive('bulletList') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Bullet list"
      >
        • List
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800',
          editor.isActive('orderedList') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Numbered list"
      >
        1. List
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800',
          editor.isActive('blockquote') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Quote"
      >
        “Quote
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="[
          'min-h-[36px] min-w-[36px] p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 font-mono',
          editor.isActive('codeBlock') ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
        ]"
        title="Code block"
      >
        &lt;/&gt;
      </button>
    </div>

    <!-- Editor Scrollable Canvas -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
      <editor-content :editor="editor" class="h-full" />
    </div>

    <!-- Delete Confirmation Modal Dialog -->
    <div
      v-if="deleteDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div class="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 id="delete-dialog-title" class="text-base font-semibold text-gray-900 dark:text-gray-100">
          Delete this note?
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          This action cannot be undone. All data in this note will be permanently deleted.
        </p>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="deleteDialogOpen = false"
            class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDelete"
            class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
