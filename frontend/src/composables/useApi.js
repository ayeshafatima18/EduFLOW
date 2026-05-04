import axios from 'axios'

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')

export function useApi() {
  const login = (email, password) =>
    axios.post(`${BASE}/auth/login`, { email, password })

  const register = (name, email, password, role) =>
    axios.post(`${BASE}/auth/register`, { name, email, password, role })

  const getRequests = () =>
    axios.get(`${BASE}/requests`)

  const createRequest = (courseTitle, description, department) =>
    axios.post(`${BASE}/requests`, { courseTitle, description, department })

  const updateStatus = (id, status, reviewNotes = '') =>
    axios.put(`${BASE}/requests/${id}/status`, { status, reviewNotes })

  const updateRequest = (id, courseTitle, department, description) =>
    axios.put(`${BASE}/requests/${id}`, { courseTitle, department, description })

  const getStats = () =>
    axios.get(`${BASE}/requests/stats`)

  const getAutoApproveStatus = () =>
    axios.get(`${BASE}/settings/auto-approve`)

  const toggleAutoApproveStatus = (enabled) =>
    axios.post(`${BASE}/settings/auto-approve`, { enabled })

  const getApprovedCourses = () =>
    axios.get(`${BASE}/courses/approved`)

  const chatWithAi = (message) =>
    axios.post(`${BASE}/chat`, { message })

  return { login, register, getRequests, createRequest, updateStatus, updateRequest, getStats, getAutoApproveStatus, toggleAutoApproveStatus, getApprovedCourses, chatWithAi }
}

