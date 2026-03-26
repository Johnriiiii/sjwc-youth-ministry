import type {
  Activity,
  ActivityStatus,
  AdminAccount,
  AdminAuditLog,
  AuthUser,
  Role,
  Submission,
  SubmissionStatus,
  YouthFormInput,
  Message,
  MessageRecipient,
} from '../types'

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:4000/api' : 'https://sjwc-youth-ministry2.onrender.com/api')
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
}) => request<{ message: string }>('/auth/signup', { method: 'POST', body: input })

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

export const listAdminUsers = (token: string) =>
  request<{ users: AdminAccount[] }>('/admin/users', { token })

export const createAdminUser = (
  token: string,
  input: {
    fullName: string
    email: string
    password: string
    role: Role
  },
) =>
  request<{ user: AdminAccount }>('/admin/users', {
    method: 'POST',
    token,
    body: input,
  })

export const updateAdminUser = (
  token: string,
  id: string,
  input: {
    fullName?: string
    email?: string
    password?: string
    role?: Role
  },
) =>
  request<{ user: AdminAccount }>(`/admin/users/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  })

export const deleteAdminUser = (token: string, id: string) =>
  request<{ success: true }>(`/admin/users/${id}`, {
    method: 'DELETE',
    token,
  })

// Message API Methods
export const sendMessage = (
  token: string,
  input: {
    title: string
    content: string
    messageType: 'Announcement' | 'Event Reminder' | 'Personal' | 'Emergency'
    recipientIds: string[]
  },
) =>
  request<{ data: Message }>('/messages', {
    method: 'POST',
    token,
    body: input,
  })

export const listMyMessages = (token: string) =>
  request<{ data: Message[] }>('/messages', { token })

export const listSentMessages = (token: string) =>
  request<{ data: Message[] }>('/messages/admin/sent', { token })

export const markMessageAsRead = (token: string, messageId: string) =>
  request<{ message: string }>(`/messages/${messageId}/read`, {
    method: 'PATCH',
    token,
  })

export const deleteMessage = (token: string, messageId: string) =>
  request<{ message: string }>(`/messages/${messageId}`, {
    method: 'DELETE',
    token,
  })

export const getMessageRecipients = (token: string) =>
  request<{ data: MessageRecipient[] }>('/messages/recipients/all', { token })
