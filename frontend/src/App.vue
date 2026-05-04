<template>
  <div id="app-root">
    <nav v-if="auth.isLoggedIn" class="navbar">
      <div class="nav-brand">
        <span class="brand-icon">◈</span>
        <span class="brand-name">EduFlow</span>
        <span class="brand-sub">FAU eLearning</span>
      </div>
      <div class="nav-links">
        <router-link v-if="auth.isAdmin" to="/dashboard">Dashboard</router-link>
        <router-link v-if="auth.isAdmin || auth.user?.role === 'faculty'" to="/my-requests">{{ auth.isAdmin ? 'All Requests' : 'My Requests' }}</router-link>
        <router-link v-if="auth.isStudent" to="/student">Course Catalog</router-link>
      </div>
      <div class="nav-user">
        <span class="user-role" :class="'role-' + auth.user?.role">{{ auth.user?.role }}</span>
        <span class="user-name">{{ auth.user?.name }}</span>
        <button class="logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </nav>
    <main :class="auth.isLoggedIn ? 'main-with-nav' : 'main-full'">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/authStore'
import { useRouter } from 'vue-router'
const auth = useAuthStore()
const router = useRouter()
function handleLogout() { auth.logout(); router.push('/login') }
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #f4f6f9; --surface: #ffffff; --border: #e0e4e8;
  --text: #111827; --muted: #6b7280; --accent: #003366;
  --accent-light: #e6eff7; --success: #16a34a; --warning: #d97706;
  --danger: #cc0000; --admin: #0055a4; --admin-light: #ebf4ff;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-md: 10px;
  --radius-lg: 16px;
}
body { 
  font-family: 'Outfit', sans-serif; 
  background: var(--bg); 
  color: var(--text); 
  font-size: 15px; 
  line-height: 1.6;
  background-image: radial-gradient(circle at top right, rgba(0, 51, 102, 0.03), transparent 400px), 
                    radial-gradient(circle at bottom left, rgba(204, 0, 0, 0.02), transparent 400px);
  background-attachment: fixed;
}
#app-root { min-height: 100vh; display: flex; flex-direction: column; }
.navbar { 
  position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border); padding: 0 2.5rem; height: 64px; 
  display: flex; align-items: center; gap: 2.5rem;
  box-shadow: var(--shadow-sm);
}
.nav-brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.brand-icon { font-size: 22px; color: var(--accent); }
.brand-name { font-weight: 700; font-size: 18px; color: var(--accent); letter-spacing: -0.02em; }
.brand-sub { font-size: 11px; color: var(--danger); background: #ffe6e6; padding: 3px 8px; border-radius: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.nav-links { display: flex; gap: 8px; flex: 1; }
.nav-links a { 
  padding: 8px 16px; border-radius: 8px; font-size: 14.5px; font-weight: 500;
  text-decoration: none; color: var(--muted); transition: all .2s ease; 
}
.nav-links a.router-link-active, .nav-links a:hover { 
  background: var(--accent-light); color: var(--accent); 
}
.nav-user { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.user-name { font-size: 14px; font-weight: 500; color: var(--text); }
.user-role { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: .05em; }
.role-admin { background: var(--admin-light); color: var(--admin); }
.role-faculty { background: var(--accent-light); color: var(--accent); }
.logout-btn { 
  font-size: 13px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border); 
  background: transparent; color: var(--muted); cursor: pointer; font-family: inherit; 
  font-weight: 500; transition: all .2s ease; 
}
.logout-btn:hover { background: var(--danger); color: white; border-color: var(--danger); }
.main-with-nav { flex: 1; padding: 2.5rem; max-width: 1280px; margin: 0 auto; width: 100%; animation: fadeIn 0.4s ease-out; }
.main-full { flex: 1; }
.card { 
  background: var(--surface); border: 1px solid var(--border); 
  border-radius: var(--radius-lg); padding: 1.8rem;
  box-shadow: var(--shadow-md); transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.btn { 
  padding: 10px 20px; border-radius: var(--radius-md); font-size: 14.5px; font-weight: 600; 
  font-family: inherit; cursor: pointer; transition: all .2s ease; border: none; 
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-primary { 
  background: linear-gradient(135deg, var(--accent) 0%, #004d99 100%); 
  color: white; box-shadow: 0 4px 12px rgba(0, 51, 102, 0.2); 
}
.btn-primary:hover { background: linear-gradient(135deg, #002244 0%, var(--accent) 100%); box-shadow: 0 6px 16px rgba(0, 51, 102, 0.3); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(1px); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }
.btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
.btn-ghost:hover { background: var(--bg); border-color: #cbd5e1; }
.badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.02em; }
.badge-pending { background: #fef3c7; color: #92400e; }
.badge-approved { background: #dcfce7; color: #15803d; }
.badge-rejected { background: #fee2e2; color: #cc0000; }
input, select, textarea { 
  width: 100%; padding: 12px 16px; border: 1px solid var(--border); 
  border-radius: var(--radius-md); font-size: 14.5px; font-family: inherit; 
  background: #f8fafc; color: var(--text); transition: all .2s ease; outline: none; 
}
input:focus, select:focus, textarea:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.1); }
label { font-size: 13.5px; font-weight: 600; color: var(--text); display: block; margin-bottom: 8px; }
.form-group { margin-bottom: 1.2rem; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
