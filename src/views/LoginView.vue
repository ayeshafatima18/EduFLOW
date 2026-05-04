<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand-block">
        <div class="big-icon">◈</div>
        <h1>EduFlow</h1>
        <p>Internal platform for FAU's COCE (Mock Project) </p>
      </div>
      <div class="feature-list">
        <div class="feature">
          <span class="f-dot" style="background:#2563eb"></span>
          Course development request tracking
        </div>
        <div class="feature">
          <span class="f-dot" style="background:#16a34a"></span>
          Role-based faculty & admin dashboards
        </div>
        <div class="feature">
          <span class="f-dot" style="background:#d97706"></span>
          AI-powered support assistant
        </div>
        <div class="feature">
          <span class="f-dot" style="background:#7c3aed"></span>
          Automated approval workflows
        </div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-card">
        <h2>Sign in</h2>
        <p class="login-sub">Use your FAU eLearning credentials</p>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>Email address</label>
            <input v-model="email" type="email" placeholder="you@fau.edu" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="password" type="password" placeholder="••••••••" required />
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:.5rem" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="demo-creds">
          <div class="demo-title">Demo credentials</div>
          <div class="demo-row" @click="fillAdmin">
            <span class="user-role role-admin">Admin</span>
            <span>admin@fau.edu / Admin@123</span>
          </div>
          <div class="demo-row" @click="fillFaculty">
            <span class="user-role role-faculty">Faculty</span>
            <span>faculty@fau.edu / Faculty@123</span>
          </div>
          <div class="demo-row" @click="fillStudent">
            <span class="user-role role-student" style="background:#fef08a;color:#854d0e">Student</span>
            <span>student@fau.edu / Student@123</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useApi } from '../composables/useApi'

const { login } = useApi()
const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

function fillAdmin() { email.value = 'admin@fau.edu'; password.value = 'Admin@123' }
function fillFaculty() { email.value = 'faculty@fau.edu'; password.value = 'Faculty@123' }
function fillStudent() { email.value = 'student@fau.edu'; password.value = 'Student@123' }

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await login(email.value, password.value)
    auth.setAuth(data.token, data.user)
    if (data.user.role === 'admin') router.push('/dashboard')
    else if (data.user.role === 'student') router.push('/student')
    else router.push('/my-requests')
  } catch (e) {
    error.value = e.response?.data?.message || 'Login failed. Check backend is running.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { display: flex; min-height: 100vh; background: #f4f6f9; }
.login-left {
  flex: 1.2;
  background-image: linear-gradient(to right, rgba(0, 51, 102, 0.85), rgba(0, 51, 102, 0.7)), url('/hero_bg.png');
  background-size: cover; background-position: center;
  color: white; padding: 4rem; display: flex; flex-direction: column; justify-content: center;
  box-shadow: inset -10px 0 20px rgba(0,0,0,0.1);
  position: relative; overflow: hidden;
}
.login-left::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at top right, rgba(204, 0, 0, 0.15), transparent 400px);
}
.brand-block { position: relative; z-index: 1; animation: slideUp 0.6s ease-out; }
.big-icon { font-size: 56px; color: #cc0000; margin-bottom: 1rem; text-shadow: 0 2px 10px rgba(204, 0, 0, 0.3); }
.login-left h1 { font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 1rem; }
.login-left p { color: #e6eff7; font-size: 16px; line-height: 1.6; margin-bottom: 3rem; max-width: 400px; }
.feature-list { display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 1; animation: slideUp 0.8s ease-out; }
.feature { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500; color: white; background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 12px; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); }
.f-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
.login-right {
  width: 500px; display: flex; align-items: center; justify-content: center; padding: 3rem;
  background: white; position: relative; z-index: 10;
  box-shadow: -10px 0 30px rgba(0,0,0,0.05);
}
.login-card { width: 100%; animation: fadeIn 0.5s ease-out; }
.login-card h2 { font-size: 26px; font-weight: 700; color: #003366; margin-bottom: 6px; }
.login-sub { color: #6b7280; font-size: 14.5px; margin-bottom: 2rem; }
.error-msg { background: #fee2e2; color: #cc0000; font-size: 13.5px; padding: 12px 16px; border-radius: 10px; margin-bottom: 1.5rem; font-weight: 500; }
.demo-creds { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e4e8; }
.demo-title { font-size: 11.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
.demo-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 500; color: #4b5563; cursor: pointer; transition: all .2s; border: 1px solid transparent; }
.demo-row:hover { background: #f8fafc; border-color: #e0e4e8; transform: translateY(-1px); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@media (max-width: 900px) {
  .login-left { display: none; }
  .login-right { width: 100%; }
}
</style>
