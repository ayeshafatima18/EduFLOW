<template>
  <div class="split-view">
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Student Dashboard</h1>
          <p class="page-sub">Track your learning progress and explore new courses</p>
        </div>
        <button class="btn btn-ghost" @click="loadCourses" :disabled="loading">↻ Refresh</button>
      </div>

      <div class="section-container">
        <LearningGarden ref="gardenRef" @expand="navigateToGraph" />
      </div>

      <h2 class="section-title">Course Catalog</h2>
      <div v-if="loading" class="loading-state">Loading courses...</div>
      <div v-else-if="!courses.length" class="empty-state">No courses are currently available.</div>

      <div v-else class="course-grid">
        <div v-for="course in courses" :key="course.id" class="card course-card">
          <div class="course-header">
            <span class="dept-badge">{{ course.department }}</span>
            <h3 class="course-title">{{ course.courseTitle }}</h3>
          </div>
          <p class="course-desc">{{ course.description }}</p>
          <div class="course-footer">
            <div class="faculty-info">
              <div class="faculty-avatar">{{ course.faculty.charAt(0) }}</div>
              <span class="faculty-name">{{ course.faculty }}</span>
            </div>
            <button class="btn btn-primary btn-sm" @click="enrollCourse(course)">Enroll</button>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-sidebar">
      <div class="chat-header">
        <div class="ai-avatar">
          <span>🤖</span>
        </div>
        <div>
          <h2 style="font-size: 16px; font-weight: 700; color: #111827;">Student AI Guide</h2>
          <p style="font-size: 12px; color: #6b7280; margin-top:2px;">Course & timeline support</p>
        </div>
      </div>

      <div class="chat-messages" ref="chatContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
        <div v-if="aiTyping" class="message ai">
          <div class="msg-bubble typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <textarea
          v-model="newMessage"
          placeholder="Ask about courses, timelines, or study tips..."
          @keydown.enter.prevent="sendMessage"
          rows="1"
        ></textarea>
        <button class="btn btn-primary" @click="sendMessage" :disabled="!newMessage.trim() || aiTyping">
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import LearningGarden from '../components/LearningGarden.vue'

const router = useRouter()
const { getApprovedCourses, chatWithAi } = useApi()
const courses = ref([])
const loading = ref(true)

const chatContainer = ref(null)
const messages = ref([
  { role: 'ai', content: 'Hi there! I am your AI Guide. I can help you pick courses that fit your Learning Garden, manage your study timeline, or answer questions about syllabus materials. What are you working on today?' }
])
const newMessage = ref('')
const aiTyping = ref(false)
const gardenRef = ref(null)

function navigateToGraph() {
  router.push('/learning-graph')
}

function enrollCourse(course) {
  gardenRef.value?.addNewNode(course.courseTitle, '📚')
  alert(`Successfully enrolled in ${course.courseTitle}! It has been added to your Learning Garden.`)
}

async function loadCourses() {
  loading.value = true
  try {
    const { data } = await getApprovedCourses()
    courses.value = data
  } catch (error) {
    console.error("Failed to load courses:", error)
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || aiTyping.value) return

  const userText = newMessage.value
  messages.value.push({ role: 'user', content: userText })
  newMessage.value = ''
  aiTyping.value = true

  await nextTick()
  if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight

  try {
    const systemPrompt = `You are an academic advisor AI for Florida Atlantic University students. Help them pick courses, manage their study timeline, and answer questions concisely. User message: "${userText}"`
    const { data } = await chatWithAi(systemPrompt)
    messages.value.push({ role: 'ai', content: data.reply })
  } catch (error) {
    messages.value.push({ role: 'ai', content: 'Sorry, I am having trouble connecting to the network right now.' })
  } finally {
    aiTyping.value = false
    await nextTick()
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

onMounted(loadCourses)
</script>

<style scoped>
.split-view { display: flex; height: calc(100vh - 64px); }
.main-content { flex: 1; padding: 2rem 3rem; overflow-y: auto; background: #f4f6f9; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; animation: slideDown 0.3s ease-out; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #003366; }
.page-sub { color: #6b7280; font-size: 15px; margin-top: 4px; }
.section-container { margin-bottom: 3rem; animation: slideUp 0.4s ease-out; }
.section-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 1.5rem; }
.loading-state, .empty-state { padding: 4rem; text-align: center; color: #6b7280; font-size: 15px; font-weight: 500; }
.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; animation: slideUp 0.5s ease-out; }
.course-card { display: flex; flex-direction: column; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; border-top: 4px solid #003366; }
.course-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 51, 102, 0.08); }
.dept-badge { display: inline-block; font-size: 11px; font-weight: 700; background: #e6eff7; color: #003366; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; }
.course-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 10px; line-height: 1.3; }
.course-desc { font-size: 14px; color: #4b5563; line-height: 1.6; flex: 1; margin-bottom: 20px; }
.course-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e0e4e8; padding-top: 16px; margin-top: auto; }
.faculty-info { display: flex; align-items: center; gap: 10px; }
.faculty-avatar { width: 32px; height: 32px; border-radius: 50%; background: #0055a4; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.faculty-name { font-size: 13.5px; font-weight: 600; color: #111827; }
.btn-sm { padding: 8px 16px; font-size: 13px; }
.chat-sidebar { width: 380px; background: white; border-left: 1px solid #e0e4e8; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.02); z-index: 10; }
.chat-header { padding: 20px; border-bottom: 1px solid #e0e4e8; display: flex; align-items: center; gap: 12px; background: #fafbfc; }
.ai-avatar { width: 40px; height: 40px; border-radius: 50%; background: #003366; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 10px rgba(0,51,102,0.2); }
.chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #fff; }
.message { display: flex; flex-direction: column; max-width: 85%; }
.message.user { align-self: flex-end; }
.message.ai { align-self: flex-start; }
.msg-bubble { padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.5; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.message.user .msg-bubble { background: #003366; color: white; border-bottom-right-radius: 4px; }
.message.ai .msg-bubble { background: #f4f6f9; color: #111827; border-bottom-left-radius: 4px; border: 1px solid #e0e4e8; }
.chat-input-area { padding: 16px; border-top: 1px solid #e0e4e8; display: flex; gap: 10px; background: #fafbfc; }
.chat-input-area textarea { flex: 1; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 10px; resize: none; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.2s; }
.chat-input-area textarea:focus { border-color: #003366; }
.chat-input-area button { padding: 0 16px; border-radius: 10px; font-size: 16px; }
.typing-indicator { display: flex; gap: 4px; padding: 16px 20px !important; }
.typing-indicator span { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; }
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
