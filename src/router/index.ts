import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import NotesView from '../views/NotesView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      name: 'notes',
      component: NotesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Wait for initial session check if needed
  if (authStore.isInitializing) {
    await authStore.init()
  }

  const authenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !authenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authenticated) {
    next({ name: 'notes' })
  } else {
    next()
  }
})

export default router
