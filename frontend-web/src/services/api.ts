import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newToken: string = data.data.accessToken
        const newRefresh: string = data.data.refreshToken

        useAuthStore.getState().setTokens(newToken, newRefresh)
        localStorage.setItem('refreshToken', newRefresh)
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

function getDownloadFilename(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) return fallback

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = contentDisposition.match(/filename="([^"]+)"|filename=([^;]+)/i)
  const rawName = plainMatch?.[1] ?? plainMatch?.[2]
  return rawName?.trim() || fallback
}

async function getDownloadErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (data instanceof Blob) {
      const text = await data.text()
      if (!text) return 'No se pudo descargar el archivo.'

      try {
        const parsed = JSON.parse(text) as { message?: string }
        return parsed.message ?? 'No se pudo descargar el archivo.'
      } catch {
        return text
      }
    }

    const responseMessage =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : ''

    if (responseMessage) return responseMessage
  }

  return error instanceof Error && error.message
    ? error.message
    : 'No se pudo descargar el archivo.'
}

async function downloadExportFile(path: string, fallbackFilename: string) {
  try {
    const response = await api.get(path, { responseType: 'blob' })
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: response.headers['content-type'] })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = getDownloadFilename(response.headers['content-disposition'], fallbackFilename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    throw new Error(await getDownloadErrorMessage(error))
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  acceptInvitation: (token: string, password: string) =>
    api.post('/auth/accept-invitation', { token, password }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/users', { params }),
  getMe: () => api.get('/users/me'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  update: (id: string, data: object) => api.patch(`/users/${id}`, data),
  bulkImportStudents: (data: {
    courseId: string
    groupName: string
    students: Array<{ firstName: string; lastName: string; email: string; nationalId: string }>
  }) => api.post('/users/bulk-import-students', data),
}

// ── Institutions ──────────────────────────────────────────────────────────────
export const institutionsApi = {
  getAll: () => api.get('/institutions'),
  create: (data: object) => api.post('/institutions', data),
  update: (id: string, data: object) => api.patch(`/institutions/${id}`, data),
  delete: (id: string) => api.delete(`/institutions/${id}`),
}

export const programsApi = {
  getAll: () => api.get('/programs'),
}

export const periodsApi = {
  getAll: () => api.get('/periods'),
}

// ── Courses ───────────────────────────────────────────────────────────────────
export const coursesApi = {
  getAll: () => api.get('/courses'),
  getById: (id: string) => api.get(`/courses/${id}`),
  create: (data: object) => api.post('/courses', data),
  update: (id: string, data: object) => api.patch(`/courses/${id}`, data),
  assignRubric: (courseId: string, rubricId: string, evaluationType: 'SELF' | 'PEER' | 'TEACHER') =>
    api.post(`/courses/${courseId}/rubrics`, { rubricId, evaluationType }),
  delete: (id: string) => api.delete(`/courses/${id}`),
}

// ── Groups ────────────────────────────────────────────────────────────────────
export const groupsApi = {
  getByCourse: (courseId: string) => api.get(`/groups?courseId=${courseId}`),
  create: (data: object) => api.post('/groups', data),
  addMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  createStudent: (groupId: string, data: {
    email: string
    firstName: string
    lastName: string
    nationalId: string
  }) => api.post(`/groups/${groupId}/students`, data),
  delete: (groupId: string) => api.delete(`/groups/${groupId}`),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export const teamsApi = {
  getByGroup: (groupId: string) => api.get(`/teams?groupId=${groupId}`),
  create: (data: object) => api.post('/teams', data),
  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
}

// ── Rubrics ───────────────────────────────────────────────────────────────────
export const rubricsApi = {
  getAll: () => api.get('/rubrics'),
  getById: (id: string) => api.get(`/rubrics/${id}`),
  create: (data: object) => api.post('/rubrics', data),
  update: (id: string, data: object) => api.put(`/rubrics/${id}`, data),
  delete: (id: string) => api.delete(`/rubrics/${id}`),
}

// ── Evaluations ───────────────────────────────────────────────────────────────
export const evaluationsApi = {
  getProcesses: () => api.get('/evaluations/processes'),
  getProcessById: (id: string) => api.get(`/evaluations/processes/${id}`),
  createProcess: (data: object) => api.post('/evaluations/processes', data),
  activateProcess: (id: string) =>
    api.post(`/evaluations/processes/${id}/activate`),
  closeProcess: (id: string) => api.patch(`/evaluations/processes/${id}/close`),
  deleteProcess: (id: string) => api.delete(`/evaluations/processes/${id}`),
  getMyPending: () => api.get('/evaluations/my-pending'),
  getById: (id: string) => api.get(`/evaluations/${id}`),
  submit: (id: string, data: object) => api.post(`/evaluations/${id}/submit`, data),
}

// ── Consolidation ──────────────────────────────────────────────────────────────
export const consolidationApi = {
  consolidate: (processId: string) =>
    api.post(`/consolidation/process/${processId}`),
  getResults: (processId: string) =>
    api.get(`/consolidation/process/${processId}/results`),
  getMyResults: () =>
    api.get('/consolidation/my-results'),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getCourse: (processId: string) => api.get(`/analytics/course/${processId}`),
  getTeam: (processId: string, teamId: string) =>
    api.get(`/analytics/team/${processId}/${teamId}`),
  getIndividual: (processId: string, studentId: string) =>
    api.get(`/analytics/individual/${processId}/${studentId}`),
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const exportApi = {
  excel: (processId: string) =>
    downloadExportFile(`/export/excel/${processId}`, `resultados_${processId}.xlsx`),
  csv: (processId: string) =>
    downloadExportFile(`/export/csv/${processId}`, `resultados_${processId}.csv`),
  pdf: (processId: string) =>
    downloadExportFile(`/export/pdf/${processId}`, `reporte_${processId}.pdf`),
}
