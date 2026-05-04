<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Operations Dashboard</h1>
        <p class="page-sub">Monitor all faculty course development requests</p>
      </div>
      <div style="display:flex; gap:16px; align-items:center;">
        <div class="workflow-toggle">
          <label class="switch">
            <input type="checkbox" v-model="isAutoApproveEnabled" @change="toggleWorkflow">
            <span class="slider round"></span>
          </label>
          <span style="font-weight:600; font-size:14px; color:#003366;">AI Auto-Approval</span>
        </div>
        <button class="btn btn-ghost" @click="refresh" :disabled="loading">↻ Refresh</button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card">
        <div class="stat-label">Total Requests</div>
        <div class="stat-num">{{ stats.totalRequests }}</div>
      </div>
      <div class="stat-card stat-warn">
        <div class="stat-label">Pending Review</div>
        <div class="stat-num">{{ stats.pendingRequests }}</div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-label">Approved</div>
        <div class="stat-num">{{ stats.approvedRequests }}</div>
      </div>
      <div class="stat-card stat-danger">
        <div class="stat-label">Rejected</div>
        <div class="stat-num">{{ stats.rejectedRequests }}</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-label">Faculty Members</div>
        <div class="stat-num">{{ stats.totalFaculty }}</div>
      </div>
    </div>

    <!-- Requests Table -->
    <div class="card" style="margin-top:1.5rem">
      <div class="table-header">
        <h3>Course Requests</h3>
        <div class="filter-row">
          <select v-model="statusFilter" style="width:140px">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading-state">Loading requests…</div>
      <div v-else-if="!filteredRequests.length" class="empty-state">No requests found.</div>
      <table v-else class="req-table">
        <thead>
          <tr>
            <th>Course Title</th>
            <th>Faculty</th>
            <th>Department</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in filteredRequests" :key="req.id" @click="selectedReq = req" class="req-row">
            <td><div class="req-title">{{ req.courseTitle }}</div><div class="req-desc">{{ req.description.slice(0, 60) }}…</div></td>
            <td>{{ req.faculty }}</td>
            <td><span class="dept-tag">{{ req.department }}</span></td>
            <td class="date-cell">{{ formatDate(req.submittedAt) }}</td>
            <td><span class="badge" :class="`badge-${req.status}`">{{ req.status }}</span></td>
            <td>
              <div v-if="req.status === 'pending'" class="action-btns">
                <button class="action-btn approve" @click.stop="reviewReq(req.id, 'approved', '')">✓ Approve</button>
                <button class="action-btn reject" @click.stop="reviewReq(req.id, 'rejected', '')">✕ Reject</button>
              </div>
              <span v-else class="reviewed-text">Reviewed {{ formatDate(req.reviewedAt) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedReq" class="modal-overlay" @click.self="selectedReq = null">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ selectedReq.courseTitle }}</h3>
          <button class="btn btn-ghost" @click="selectedReq = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row"><span class="detail-label">Faculty</span><span>{{ selectedReq.faculty }} ({{ selectedReq.facultyEmail }})</span></div>

          <!-- Editable fields -->
          <template v-if="isEditing">
            <div class="form-group" style="margin-bottom:12px">
              <label>Course Title</label>
              <input v-model="editForm.courseTitle" />
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label>Department</label>
              <input v-model="editForm.department" />
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label>Description</label>
              <textarea v-model="editForm.description" rows="5"></textarea>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <button class="btn btn-primary" @click="saveEdit">💾 Save</button>
              <button class="btn btn-ghost" @click="isEditing = false">Cancel</button>
            </div>
          </template>
          <template v-else>
            <div class="detail-row"><span class="detail-label">Department</span><span>{{ selectedReq.department }}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="badge" :class="`badge-${selectedReq.status}`">{{ selectedReq.status }}</span></div>
            <div class="detail-row"><span class="detail-label">Description</span></div>
            <div class="detail-desc">{{ selectedReq.description }}</div>
            <div v-if="selectedReq.reviewNotes" class="detail-row"><span class="detail-label">Review Notes</span><span>{{ selectedReq.reviewNotes }}</span></div>
            <button class="btn btn-ghost" style="margin-top:4px;font-size:13px" @click="startEdit">✏️ Edit Course Details</button>
          </template>
        </div>
        <div v-if="selectedReq.status === 'pending' && !isEditing" class="modal-footer">
          <div class="form-group">
            <label>Review Notes (optional)</label>
            <textarea v-model="reviewNotes" rows="2" placeholder="Add feedback for the faculty member…"></textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" @click="reviewReq(selectedReq.id, 'approved', reviewNotes)">Approve</button>
            <button class="btn btn-ghost" style="border-color:#dc2626;color:#dc2626" @click="reviewReq(selectedReq.id, 'rejected', reviewNotes)">Reject</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../composables/useApi'

const { getRequests, getStats, updateStatus, updateRequest, getAutoApproveStatus, toggleAutoApproveStatus } = useApi()

const requests = ref([])
const stats = ref(null)
const loading = ref(true)
const statusFilter = ref('')
const selectedReq = ref(null)
const reviewNotes = ref('')
const isAutoApproveEnabled = ref(true)
const isEditing = ref(false)
const editForm = ref({ courseTitle: '', department: '', description: '' })

function startEdit() {
  editForm.value = {
    courseTitle: selectedReq.value.courseTitle,
    department: selectedReq.value.department,
    description: selectedReq.value.description
  }
  isEditing.value = true
}

async function saveEdit() {
  try {
    await updateRequest(selectedReq.value.id, editForm.value.courseTitle, editForm.value.department, editForm.value.description)
    isEditing.value = false
    selectedReq.value = null
    await refresh()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to save changes.')
  }
}

const filteredRequests = computed(() =>
  statusFilter.value ? requests.value.filter(r => r.status === statusFilter.value) : requests.value
)

async function refresh() {
  loading.value = true
  try {
    const [reqRes, statsRes, settingsRes] = await Promise.all([getRequests(), getStats(), getAutoApproveStatus()])
    requests.value = reqRes.data
    stats.value = statsRes.data
    isAutoApproveEnabled.value = settingsRes.data.enabled
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function toggleWorkflow() {
  try {
    await toggleAutoApproveStatus(isAutoApproveEnabled.value)
  } catch (e) {
    console.error(e)
    isAutoApproveEnabled.value = !isAutoApproveEnabled.value
  }
}

watch(selectedReq, (val) => { if (!val) isEditing.value = false })

async function reviewReq(id, status, notes) {
  await updateStatus(id, status, notes)
  selectedReq.value = null
  reviewNotes.value = ''
  await refresh()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(refresh)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; animation: slideDown 0.3s ease-out; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #003366; }
.page-sub { color: #6b7280; font-size: 15px; margin-top: 4px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; animation: slideUp 0.4s ease-out; }
.stat-card { background: white; border: 1px solid #e0e4e8; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
.stat-label { font-size: 12.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.stat-num { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; color: #111827; }
.stat-warn { border-left: 4px solid #d97706; }
.stat-success { border-left: 4px solid #16a34a; }
.stat-danger { border-left: 4px solid #cc0000; }
.stat-purple { border-left: 4px solid #0055a4; }

.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.table-header h3 { font-size: 18px; font-weight: 700; color: #003366; }
.req-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
.req-table th { text-align: left; padding: 12px 16px; font-size: 12.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #e0e4e8; }
.req-table td { padding: 16px; border-bottom: 1px solid #e0e4e8; vertical-align: top; }
.req-row { cursor: pointer; transition: background .15s; }
.req-row:hover { background: #f8fafc; }
.req-title { font-weight: 600; margin-bottom: 4px; color: #111827; }
.req-desc { font-size: 13.5px; color: #4b5563; }
.dept-tag { font-size: 12.5px; font-weight: 500; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; color: #4b5563; }
.date-cell { font-size: 13.5px; color: #6b7280; white-space: nowrap; }
.action-btns { display: flex; gap: 8px; }
.action-btn { font-size: 13px; padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; font-weight: 600; transition: all .2s; }
.action-btn.approve { background: #dcfce7; color: #15803d; }
.action-btn.approve:hover { background: #bbf7d0; transform: translateY(-1px); }
.action-btn.reject { background: #fee2e2; color: #cc0000; }
.action-btn.reject:hover { background: #fecaca; transform: translateY(-1px); }
.reviewed-text { font-size: 13px; color: #6b7280; font-weight: 500; }
.loading-state, .empty-state { padding: 3rem; text-align: center; color: #6b7280; font-size: 15px; font-weight: 500; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 51, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; animation: fadeIn 0.2s ease-out; }
.modal { background: white; border-radius: 20px; width: 600px; max-width: 95vw; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: scaleUp 0.3s ease-out; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid #e0e4e8; background: #f8fafc; }
.modal-header h3 { font-size: 18px; font-weight: 700; color: #003366; }
.modal-body { padding: 2rem; }
.modal-footer { padding: 1.5rem 2rem; border-top: 1px solid #e0e4e8; background: #f8fafc; }
.detail-row { display: flex; gap: 16px; margin-bottom: 12px; align-items: baseline; }
.detail-label { font-size: 12.5px; font-weight: 700; color: #6b7280; min-width: 100px; text-transform: uppercase; letter-spacing: .04em; }
.detail-desc { background: #f8fafc; border-radius: 12px; padding: 14px 18px; font-size: 14.5px; line-height: 1.6; color: #111827; margin-bottom: 16px; border: 1px solid #e0e4e8; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

.workflow-toggle { display: flex; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: 20px; border: 1px solid #e0e4e8; }
.switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #10b981; }
input:checked + .slider:before { transform: translateX(16px); }
.slider.round { border-radius: 20px; }
.slider.round:before { border-radius: 50%; }
</style>
