<template>
  <div class="faculty-layout">
    <div class="faculty-main">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Course Requests</h1>
          <p class="page-sub">Submit and track your course development proposals</p>
        </div>
        <button class="btn" :class="showForm ? 'btn-ghost' : 'btn-primary'" @click="showForm = !showForm">
          {{ showForm ? '✕ Cancel' : '+ New Request' }}
        </button>
      </div>

      <!-- Honeycomb Learning Garden -->
      <div class="section-container" v-if="!showForm">
        <h2 class="section-title">Faculty Professional Development</h2>
        <LearningGarden @expand="navigateToGraph" />
      </div>

      <!-- Submit Form -->
      <div v-if="showForm" class="card form-card">
        <h3 style="margin-bottom:1.2rem;font-size:15px;font-weight:600">Submit Course Development Request</h3>
        <div v-if="formError" class="error-msg">{{ formError }}</div>
        <form @submit.prevent="submitRequest">
          <div class="form-group">
            <label>Course Title *</label>
            <input v-model="form.courseTitle" placeholder="e.g. Introduction to Data Literacy" required />
          </div>
          <div class="form-group">
            <label>Department *</label>
            <select v-model="form.department" required>
              <option value="">Select department</option>
              <option>Computer Science</option>
              <option>Business</option>
              <option>Education</option>
              <option>Science & Technology</option>
              <option>Arts & Humanities</option>
              <option>Health & Social Services</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Description *</label>
            <textarea v-model="form.description" rows="4"
              placeholder="Describe the course objectives, target audience, and why this course is needed…" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Submitting…' : 'Submit Request' }}
          </button>
        </form>
      </div>

      <!-- Request List -->
      <div v-if="loading" class="empty-state">Loading your requests…</div>
      <div v-else-if="!requests.length && !showForm" class="empty-state card">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        <div>No requests yet. Click "New Request" to submit your first one.</div>
      </div>
      <div v-else class="request-list">
        <div v-for="req in requests" :key="req.id" class="req-card card">
          <div class="req-card-header">
            <div>
              <div class="req-card-title">{{ req.courseTitle }}</div>
              <div class="req-card-meta">{{ req.department }} · {{ formatDate(req.submittedAt) }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button v-if="req.status === 'pending' && editingId !== req.id"
                class="btn btn-ghost btn-sm" style="font-size:13px;padding:4px 10px"
                @click="startEdit(req)">✏️ Edit
              </button>
              <span class="badge" :class="`badge-${req.status}`">{{ req.status }}</span>
            </div>
          </div>

          <!-- Inline edit form -->
          <template v-if="editingId === req.id">
            <div class="inline-edit">
              <div class="form-group">
                <label>Course Title</label>
                <input v-model="editForm.courseTitle" />
              </div>
              <div class="form-group">
                <label>Department</label>
                <input v-model="editForm.department" />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea v-model="editForm.description" rows="4" placeholder="Describe the course objectives…"></textarea>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-primary btn-sm" @click="saveEdit(req.id)">💾 Save Changes</button>
                <button class="btn btn-ghost btn-sm" @click="editingId = null">Cancel</button>
              </div>
            </div>
          </template>
          <template v-else>
            <p class="req-card-desc">{{ req.description }}</p>
          </template>

          <div v-if="req.reviewNotes" class="review-note">
            <span class="review-label">Reviewer note:</span> {{ req.reviewNotes }}
          </div>
        </div>
      </div>
    </div>

    <!-- AI Chat Sidebar -->
    <div class="chat-sidebar">
      <div class="chat-header">
        <img src="/ai_avatar.png" alt="AI" class="chat-avatar-img" />
        <div>
          <div class="chat-name">EduFlow Assistant</div>
          <div class="chat-status">● Online</div>
        </div>
      </div>
      <div class="chat-messages" ref="messagesEl">
        <div v-if="!messages.length" class="chat-welcome">
          <p>Hi {{ auth.user?.name?.split(' ')[0] }}! I can help you with:</p>
          <div class="suggestion" @click="sendSuggestion('What do I need to include in a course request?')">What to include in a request?</div>
          <div class="suggestion" @click="sendSuggestion('What are the typical review timelines?')">Review timelines?</div>
          <div class="suggestion" @click="sendSuggestion('How do I get eLearning support for course design?')">eLearning support?</div>
        </div>
        <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.role">
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
        <div v-if="aiLoading" class="msg-row assistant">
          <div class="msg-bubble typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
      <div class="chat-input-row">
        <input v-model="chatInput" @keydown.enter="sendMessage"
          placeholder="Ask a question…" :disabled="aiLoading" />
        <button class="send-btn" @click="sendMessage" :disabled="!chatInput.trim() || aiLoading">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useApi } from '../composables/useApi'
import LearningGarden from '../components/LearningGarden.vue'

const router = useRouter()
const { getRequests, createRequest, chatWithAi, updateRequest } = useApi()
const auth = useAuthStore()

const requests = ref([])
const loading = ref(true)
const showForm = ref(false)

function navigateToGraph() {
  router.push('/learning-graph')
}

const submitting = ref(false)
const formError = ref('')
const form = ref({ courseTitle: '', department: '', description: '' })
const editingId = ref(null)
const editForm = ref({ courseTitle: '', department: '', description: '' })

function startEdit(req) {
  editingId.value = req.id
  editForm.value = { courseTitle: req.courseTitle, department: req.department, description: req.description }
}

async function saveEdit(id) {
  try {
    await updateRequest(id, editForm.value.courseTitle, editForm.value.department, editForm.value.description)
    editingId.value = null
    await loadRequests()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to save changes.')
  }
}

const messages = ref([])
const chatInput = ref('')
const aiLoading = ref(false)
const messagesEl = ref(null)

let msgId = 0

async function loadRequests() {
  loading.value = true
  try { requests.value = (await getRequests()).data }
  finally { loading.value = false }
}

async function submitRequest() {
  formError.value = ''
  submitting.value = true
  try {
    await createRequest(form.value.courseTitle, form.value.description, form.value.department)
    form.value = { courseTitle: '', department: '', description: '' }
    showForm.value = false
    await loadRequests()
  } catch (e) {
    formError.value = e.response?.data?.message || 'Submission failed. Try again.'
  } finally {
    submitting.value = false
  }
}

async function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || aiLoading.value) return
  chatInput.value = ''
  messages.value.push({ id: ++msgId, role: 'user', content: text })
  aiLoading.value = true
  await scrollToBottom()
  try {
    const systemPrompt = `You are 'EduFlow Assistant', a helpful AI guide for Florida Atlantic University (FAU) faculty members submitting course development requests. 
    Be concise, helpful, and polite. 
    User message: "${text}"`;
    const { data } = await chatWithAi(systemPrompt)
    messages.value.push({ id: ++msgId, role: 'assistant', content: data.reply })
  } catch {
    messages.value.push({ id: ++msgId, role: 'assistant', content: 'Sorry, the AI assistant is not available right now. Make sure your OpenAI API key is configured.' })
  } finally {
    aiLoading.value = false
    await scrollToBottom()
  }
}

function sendSuggestion(text) { chatInput.value = text; sendMessage() }

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(loadRequests)
</script>

<style scoped>
.faculty-layout { display: grid; grid-template-columns: 1fr 380px; gap: 2rem; align-items: start; }
.faculty-main { min-width: 0; animation: fadeIn 0.4s ease-out; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #003366; }
.page-sub { color: #6b7280; font-size: 15px; margin-top: 4px; }
.form-card { margin-bottom: 2rem; animation: slideDown 0.3s ease-out; }
.error-msg { background: #fee2e2; color: #cc0000; font-size: 13.5px; padding: 12px 16px; border-radius: 10px; margin-bottom: 1rem; font-weight: 500; }

.request-list { display: flex; flex-direction: column; gap: 16px; }
.req-card { border-left: 4px solid #003366; }
.req-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.req-card-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #111827; }
.req-card-meta { font-size: 13.5px; color: #6b7280; font-weight: 500; }
.req-card-desc { font-size: 14.5px; color: #4b5563; line-height: 1.6; }
.review-note { margin-top: 12px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 14px; border-left: 3px solid #cc0000; }
.review-label { font-weight: 600; color: #111827; }
.empty-state { text-align: center; padding: 4rem 2rem; color: #6b7280; font-size: 15px; font-weight: 500; }
.inline-edit { background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 12px; border: 1px solid #e0e4e8; display: flex; flex-direction: column; gap: 12px; }

/* Chat sidebar */
.chat-sidebar {
  position: sticky; top: 88px;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
  border: 1px solid #e0e4e8; box-shadow: 0 10px 25px rgba(0, 51, 102, 0.08);
  border-radius: 16px; display: flex; flex-direction: column;
  height: calc(100vh - 120px); overflow: hidden;
  animation: slideLeft 0.5s ease-out;
}
.chat-header { padding: 1.2rem 1.5rem; border-bottom: 1px solid #e0e4e8; display: flex; align-items: center; gap: 12px; background: linear-gradient(to right, #ffffff, #f8fafc); }
.chat-avatar-img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #e6eff7; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.chat-name { font-size: 15px; font-weight: 600; color: #003366; }
.chat-status { font-size: 12px; color: #16a34a; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.chat-status::before { content: ''; display: inline-block; width: 6px; height: 6px; background: #16a34a; border-radius: 50%; }

.chat-messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
.chat-welcome { color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 10px; }
.chat-welcome p { margin-bottom: 12px; }
.suggestion { padding: 10px 14px; background: #f8fafc; border-radius: 10px; font-size: 13.5px; font-weight: 500; color: #003366; cursor: pointer; margin-bottom: 8px; transition: all .2s; border: 1px solid #e0e4e8; }
.suggestion:hover { background: #e6eff7; border-color: #003366; transform: translateY(-1px); }

.msg-row { display: flex; animation: slideUp 0.3s ease-out; }
.msg-row.user { justify-content: flex-end; }
.msg-row.assistant { justify-content: flex-start; }
.msg-bubble { max-width: 85%; padding: 12px 16px; border-radius: 14px; font-size: 14.5px; line-height: 1.5; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.msg-row.user .msg-bubble { background: linear-gradient(135deg, #003366 0%, #004d99 100%); color: white; border-bottom-right-radius: 4px; }
.msg-row.assistant .msg-bubble { background: white; color: #111827; border: 1px solid #e0e4e8; border-bottom-left-radius: 4px; }

.typing { display: flex; gap: 6px; align-items: center; padding: 14px 18px; }
.typing span { width: 6px; height: 6px; border-radius: 50%; background: #003366; animation: bounce .8s infinite; opacity: 0.6; }
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes bounce { 0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)} }

.chat-input-row { padding: 1rem 1.5rem; border-top: 1px solid #e0e4e8; display: flex; gap: 10px; background: white; }
.chat-input-row input { border-radius: 24px; font-size: 14px; padding: 12px 20px; background: #f8fafc; border: 1px solid #e0e4e8; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02); }
.chat-input-row input:focus { background: white; border-color: #003366; }
.send-btn { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #cc0000 0%, #990000 100%); color: white; border: none; cursor: pointer; font-size: 18px; flex-shrink: 0; transition: all .2s; box-shadow: 0 4px 10px rgba(204,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 14px rgba(204,0,0,0.4); }
.send-btn:active { transform: scale(0.95); }
.send-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

@media (max-width: 900px) {
  .faculty-layout { grid-template-columns: 1fr; }
  .chat-sidebar { position: static; height: 500px; margin-top: 2rem; }
}
</style>
