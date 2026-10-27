import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Security frame-busting check (mitigate clickjacking / framing)
try {
  if (window.top && window.top !== window.self) {
    window.top.location.href = window.self.location.href
  }
} catch {
  // Guard against cross-origin frame access exceptions
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
