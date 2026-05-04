<template>
  <div class="full-screen-graph">
    <div class="top-nav">
      <button class="btn btn-ghost" @click="goBack">← Back</button>
      <h2>Deep Learning Garden</h2>
      <div>
        <button class="btn btn-primary btn-sm" @click="addNewNode">+ Add Node</button>
      </div>
    </div>

    <div class="split-view">
      <div class="graph-panel">
        <LearningGarden ref="gardenRef" :isFullScreen="true" @node-selected="handleNodeSelected" />
      </div>

      <div class="agent-sidebar">
        <div class="agent-header">
          <div class="ai-avatar pulse-avatar">🤖</div>
          <div>
            <h3>Garden Guide</h3>
            <p>Connecting the dots of your journey</p>
          </div>
        </div>

        <div class="sidebar-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'">AI Guide</button>
          <button class="tab-btn" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">My Content</button>
        </div>

        <template v-if="activeTab === 'ai'">
          <div class="chat-container" ref="chatRef">
            <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
              <div class="msg-bubble" v-html="msg.content"></div>
              <button
                v-if="msg.role === 'ai' && currentNode && i > 0"
                class="save-to-node-btn"
                @click="saveAiResponseToNode(msg.content)"
                title="Save this AI insight to your node's content"
              >
                💾 Save to Node
              </button>
            </div>
            <div v-if="aiTyping" class="message ai">
              <div class="msg-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
          <div class="chat-input-area" style="flex-direction: column; gap: 8px;">
            <button class="btn btn-ghost" style="width:100%; border: 1px solid #e0e4e8"
                    v-if="currentNode && nodeContent[currentNode.id]?.length"
                    @click="summarizeContent" :disabled="aiTyping">
              ✨ Summarize My Notes for {{ currentNode.label }}
            </button>
            <div style="display:flex; gap: 8px;">
              <textarea
                v-model="newMessage"
                placeholder="Ask how concepts connect..."
                @keydown.enter.prevent="sendMessage"
                rows="2"
              ></textarea>
              <button class="btn btn-primary" @click="sendMessage" :disabled="!newMessage.trim() || aiTyping">➤</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="content-container">
            <div v-if="!currentNode" class="empty-state">
              <p>Select a node in the graph to view or add content.</p>
            </div>
            <div v-else class="node-content-view">
              <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e4e8; margin-bottom: 16px; padding-bottom: 12px;">
                <input v-model="currentNode.label" class="node-edit-input" @change="gardenRef?.saveGraph()" />
                <button class="btn btn-ghost" style="color: #cc0000; font-size:12px; padding: 4px" @click="deleteNode">🗑 Delete Node</button>
              </div>

              <div class="notes-list" v-if="nodeContent[currentNode.id]?.length">
                <div v-for="(note, idx) in nodeContent[currentNode.id]" :key="idx" class="note-card">
                  <div class="note-type-badge">{{ note.type }}</div>
                  <p v-if="note.type === 'link'"><a :href="note.text" target="_blank">{{ note.text }}</a></p>
                  <p v-else>{{ note.text }}</p>
                  <span class="note-date">{{ note.date }}</span>
                </div>
              </div>
              <div v-else class="empty-state" style="padding: 2rem 0;">
                <p>No content added yet. Add your links, summaries, or notes below!</p>
              </div>
            </div>
          </div>
          <div class="chat-input-area" v-if="currentNode" style="flex-direction: column; gap: 8px;">
            <select v-model="newNoteType" class="content-type-select">
              <option value="text">📄 Text / Note</option>
              <option value="link">🔗 Web Link</option>
              <option value="video">📺 Video URL</option>
              <option value="pdf">📕 PDF Link</option>
            </select>
            <div style="display:flex; gap: 8px;">
              <textarea
                v-model="newNote"
                placeholder="Add content..."
                @keydown.enter.prevent="addNote"
                rows="2"
              ></textarea>
              <button class="btn btn-primary" @click="addNote" :disabled="!newNote.trim()">+</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useApi } from '../composables/useApi'
import LearningGarden from '../components/LearningGarden.vue'

const router = useRouter()
const auth = useAuthStore()
const { chatWithAi } = useApi()

const gardenRef = ref(null)
const chatRef = ref(null)
const newMessage = ref('')
const aiTyping = ref(false)

const activeTab = ref('ai')
const currentNode = ref(null)
const newNote = ref('')
const newNoteType = ref('text')
const nodeContent = ref({})

const messages = ref([
  { role: 'ai', content: 'Welcome to your deep Learning Garden! Click on any node in your constellation, and I will walk you through how it connects to your overall degree path, or ask me how two specific subjects relate.' }
])

function goBack() {
  if (auth.isFaculty) {
    router.push('/faculty')
  } else {
    router.push('/student')
  }
}

function loadContent() {
  const userEmail = auth.user?.email || 'default'
  const saved = localStorage.getItem(`garden_content_${userEmail}`)
  if (saved) nodeContent.value = JSON.parse(saved)
}

function saveContent() {
  const userEmail = auth.user?.email || 'default'
  localStorage.setItem(`garden_content_${userEmail}`, JSON.stringify(nodeContent.value))
}

function addNewNode() {
  gardenRef.value?.addNewNode()
}

function deleteNode() {
  gardenRef.value?.deleteActiveNode()
  currentNode.value = null
}

async function handleNodeSelected(node) {
  currentNode.value = node

  if (activeTab.value === 'ai') {
    const prompt = `Tell me more about ${node.label}. How does it connect to my other studies in a 2-3 sentence engaging summary?`
    messages.value.push({ role: 'user', content: `*Clicked on ${node.icon} ${node.label}*` })
    aiTyping.value = true
    await nextTick()
    scrollToBottom()

    try {
      const { data } = await chatWithAi(prompt)
      messages.value.push({ role: 'ai', content: `<strong>${node.label}:</strong><br/>` + data.reply })
    } catch (e) {
      messages.value.push({ role: 'ai', content: 'Sorry, I lost my connection.' })
    } finally {
      aiTyping.value = false
      await nextTick()
      scrollToBottom()
    }
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || aiTyping.value) return
  const text = newMessage.value
  messages.value.push({ role: 'user', content: text })
  newMessage.value = ''
  aiTyping.value = true
  await nextTick()
  scrollToBottom()

  try {
    let contextPrompt = `You are a personalized Learning Garden AI tutor. Help the user connect concepts together. User question: ${text}`

    if (currentNode.value && nodeContent.value[currentNode.value.id]?.length > 0) {
      const savedData = nodeContent.value[currentNode.value.id].map(n => `[${n.type}] ${n.text}`).join('\n')
      contextPrompt = `Background Context: I am currently focusing on a learning node called "${currentNode.value.label}".
      Here is the data I have stored in this node:
      ${savedData}

      Using ONLY the context above (if relevant), please answer my following question. If the context doesn't have the answer, use your general knowledge but mention it isn't in my notes.

      My Question: ${text}`
    } else if (currentNode.value) {
      contextPrompt = `You are a personalized Learning Garden AI tutor. I am currently focusing on the topic "${currentNode.value.label}". User question: ${text}`
    }

    const { data } = await chatWithAi(contextPrompt)
    messages.value.push({ role: 'ai', content: data.reply })
  } catch (e) {
    messages.value.push({ role: 'ai', content: 'Error connecting to brain.' })
  } finally {
    aiTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function summarizeContent() {
  if (!currentNode.value || !nodeContent.value[currentNode.value.id]) return

  const contentToSummarize = nodeContent.value[currentNode.value.id].map(n => `[${n.type}] ${n.text}`).join('\n')
  const prompt = `Summarize the following notes and content I have saved for my '${currentNode.value.label}' skill node:\n\n${contentToSummarize}`

  activeTab.value = 'ai'
  messages.value.push({ role: 'user', content: `*Please summarize my notes for ${currentNode.value.label}*` })
  aiTyping.value = true
  await nextTick()
  scrollToBottom()

  try {
    const { data } = await chatWithAi(prompt)
    messages.value.push({ role: 'ai', content: `<strong>Summary of ${currentNode.value.label} notes:</strong><br/>` + data.reply })
  } catch (e) {
    messages.value.push({ role: 'ai', content: 'Failed to summarize notes.' })
  } finally {
    aiTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

function addNote() {
  if (!newNote.value.trim() || !currentNode.value) return
  if (!nodeContent.value[currentNode.value.id]) {
    nodeContent.value[currentNode.value.id] = []
  }
  nodeContent.value[currentNode.value.id].push({
    type: newNoteType.value,
    text: newNote.value,
    date: new Date().toLocaleDateString()
  })
  newNote.value = ''
  saveContent()
}

function scrollToBottom() {
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
}

function saveAiResponseToNode(content) {
  if (!currentNode.value) return
  if (!nodeContent.value[currentNode.value.id]) {
    nodeContent.value[currentNode.value.id] = []
  }
  let cleanText = content.replace(/<strong>.*?<\/strong><br\/>/g, '').replace(/<[^>]+>/g, '').trim()
  nodeContent.value[currentNode.value.id].push({
    type: 'text',
    text: `[AI Insight] ${cleanText}`,
    date: new Date().toLocaleDateString()
  })
  saveContent()
  activeTab.value = 'notes'
}

onMounted(() => {
  loadContent()
})
</script>

<style scoped>
.save-to-node-btn {
  background: none;
  border: none;
  color: #003366;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}
.save-to-node-btn:hover { background: #e0e4e8; }
.full-screen-graph { height: 100vh; display: flex; flex-direction: column; background: #001224; color: white; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; }
.top-nav { padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); backdrop-filter: blur(10px); }
.top-nav h2 { font-size: 18px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #e6eff7; }
.btn-ghost { color: white; }
.btn-ghost:hover { background: rgba(255,255,255,0.1); }
.split-view { display: flex; flex: 1; overflow: hidden; }
.graph-panel { flex: 1; position: relative; }
.agent-sidebar { width: 400px; background: white; color: #111827; display: flex; flex-direction: column; border-left: 1px solid #e0e4e8; }
.agent-header { padding: 24px; border-bottom: 1px solid #e0e4e8; display: flex; align-items: center; gap: 16px; background: #f8fafc; }
.agent-header h3 { font-size: 18px; font-weight: 700; color: #003366; }
.agent-header p { font-size: 13px; color: #6b7280; margin-top: 2px; }
.ai-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #003366, #cc0000); display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(204,0,0,0.3); }
.chat-container { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.message { max-width: 85%; display: flex; flex-direction: column; }
.message.user { align-self: flex-end; }
.message.ai { align-self: flex-start; }
.msg-bubble { padding: 14px 18px; border-radius: 16px; font-size: 14.5px; line-height: 1.6; }
.message.user .msg-bubble { background: #003366; color: white; border-bottom-right-radius: 4px; }
.message.ai .msg-bubble { background: #f4f6f9; color: #334155; border-bottom-left-radius: 4px; border: 1px solid #e0e4e8; }
.chat-input-area { padding: 20px; border-top: 1px solid #e0e4e8; display: flex; gap: 12px; background: white; }
.chat-input-area textarea { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 12px; resize: none; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.2s; }
.chat-input-area textarea:focus { border-color: #003366; }
.chat-input-area button { border-radius: 12px; padding: 0 20px; font-size: 18px; }
.sidebar-tabs { display: flex; border-bottom: 1px solid #e0e4e8; background: #fafbfc; }
.tab-btn { flex: 1; padding: 12px; font-size: 14px; font-weight: 600; color: #6b7280; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
.tab-btn:hover { color: #003366; background: rgba(0,51,102,0.02); }
.tab-btn.active { color: #cc0000; border-bottom-color: #cc0000; background: white; }
.content-container { flex: 1; overflow-y: auto; padding: 24px; background: #fff; }
.empty-state { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 2rem; }
.node-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e0e4e8; }
.notes-list { display: flex; flex-direction: column; gap: 12px; }
.note-card { padding: 14px; background: #f8fafc; border: 1px solid #e0e4e8; border-left: 3px solid #003366; border-radius: 8px; }
.note-card p { font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 8px; }
.note-date { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; }
.typing-indicator { display: flex; gap: 6px; padding: 16px 20px !important; }
.typing-indicator span { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; }
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
.pulse-avatar { animation: avatarPulse 3s infinite; }
@keyframes avatarPulse { 0% { box-shadow: 0 0 0 0 rgba(204,0,0,0.4); } 70% { box-shadow: 0 0 0 15px rgba(204,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(204,0,0,0); } }
</style>
