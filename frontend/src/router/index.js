import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import FacultyView from '../views/FacultyView.vue'
import StudentView from '../views/StudentView.vue'
import LearningGraphView from '../views/LearningGraphView.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginView },
  {
    path: '/dashboard',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/my-requests',
    component: FacultyView,
    meta: { requiresAuth: true, requiresFaculty: true }
  },
  {
    path: '/student',
    component: StudentView,
    meta: { requiresAuth: true, requiresStudent: true }
  },
  {
    path: '/learning-graph',
    component: LearningGraphView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login'
  
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return auth.isStudent ? '/student' : '/my-requests'
  }
  if (to.meta.requiresFaculty && auth.user?.role !== 'faculty') {
    return auth.isAdmin ? '/dashboard' : '/student'
  }
  if (to.meta.requiresStudent && !auth.isStudent) {
    return auth.isAdmin ? '/dashboard' : '/my-requests'
  }

  if (to.path === '/login' && auth.isLoggedIn) {
    if (auth.isAdmin) return '/dashboard'
    if (auth.isStudent) return '/student'
    return '/my-requests'
  }
})

export default router
