import type {
  Activity,
  ActivityStatus,
  AdminAuditLog,
  AuthUser,
  Role,
  Submission,
  SubmissionStatus,
  YouthFormInput,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const TOKEN_KEY = 'sjwc-token'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

const request = async <T>(path: string, options: RequestOptions = {}) => {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach backend API. Check server status and MongoDB credentials.')
  }

  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed')
  }

  return payload
}

export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const readToken = () => localStorage.getItem(TOKEN_KEY)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const signup = (input: {
  fullName: string
  email: string
  password: string
  role?: Role
}) => request<{ token: string; user: AuthUser }>('/auth/signup', { method: 'POST', body: input })

export const login = (input: { email: string; password: string }) =>
  request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: input })

export const me = (token: string) => request<{ user: AuthUser }>('/auth/me', { token })

export const createSubmission = (token: string, input: YouthFormInput) =>
  request<{ submission: Submission }>('/submissions', { method: 'POST', token, body: input })

export const listMySubmissions = (token: string) =>
  request<{ submissions: Submission[] }>('/submissions/mine', { token })

export const listAdminSubmissions = (token: string) =>
  request<{ submissions: Submission[] }>('/admin/submissions', { token })

export const updateSubmissionStatus = (token: string, id: string, status: SubmissionStatus) =>
  request<{ submission: Submission }>(`/admin/submissions/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  })

export const updateAdminSubmission = (
  token: string,
  id: string,
  input: {
    fullName: string
    middleName: string
    gender: 'Male' | 'Female' | 'Other'
    age: number
    birthdate: string
    registrationDate: string
    contactNumber: string
    address: string
    guardianContact: string
    emergencyContactPerson: string
    emergencyContactNumber: string
  },
) =>
  request<{ submission: Submission }>(`/admin/submissions/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  })

export const deleteAdminSubmission = (token: string, id: string) =>
  request<{ success: true }>(`/admin/submissions/${id}`, {
    method: 'DELETE',
    token,
  })

export const listActivities = () => request<{ activities: Activity[] }>('/activities')

export const listAdminActivities = (token: string) =>
  request<{ activities: Activity[] }>('/admin/activities', { token })

export const createAdminActivity = (
  token: string,
  input: {
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  },
) =>
  request<{ activity: Activity }>('/admin/activities', {
    method: 'POST',
    token,
    body: input,
  })

export const deleteAdminActivity = (token: string, id: string) =>
  request<{ success: true }>(`/admin/activities/${id}`, {
    method: 'DELETE',
    token,
  })

export const updateAdminActivity = (
  token: string,
  id: string,
  input: {
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  },
) =>
  request<{ activity: Activity }>(`/admin/activities/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  })

export const updateAdminActivityStatus = (token: string, id: string, status: ActivityStatus) =>
  request<{ activity: Activity }>(`/admin/activities/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  })

export const listAdminAuditLogs = (token: string) =>
  request<{ logs: AdminAuditLog[] }>('/admin/audit-logs', { token })
