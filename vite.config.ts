import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Base URL for GitHub Pages deployment. Matches repository name by default.
// Can be customized via VITE_BASE_PATH environment variable if repo name differs.
const base = process.env.VITE_BASE_PATH || '/note/'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: base,
})
