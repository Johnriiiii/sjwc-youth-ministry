import { useMemo, useState, type FormEvent } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from './Card'
import type {
  Activity,
  ActivityStatus,
  AdminAccount,
  AdminAuditLog,
  Submission,
  SubmissionStatus,
  Message,
} from '../types'

type ListProps = {
  loading: boolean
  submissions: Submission[]
  onUpdateStatus: (id: string, status: SubmissionStatus) => Promise<void>
  onEditSubmission: (
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
  ) => Promise<Submission>
  onDeleteSubmission: (id: string) => Promise<void>
  activities: Activity[]
  onCreateActivity: (input: {
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  }) => Promise<void>
  onEditActivity: (id: string, input: {
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  }) => Promise<void>
  onUpdateActivityStatus: (id: string, status: ActivityStatus) => Promise<void>
  onDeleteActivity: (id: string) => Promise<void>
  accounts: AdminAccount[]
  currentAdminId: string
  onCreateAccount: (input: {
    fullName: string
    email: string
    password: string
    role: 0 | 1
  }) => Promise<void>
  onEditAccount: (
    id: string,
    input: {
      fullName?: string
      email?: string
      password?: string
      role?: 0 | 1
    },
  ) => Promise<void>
  onDeleteAccount: (id: string) => Promise<void>
  auditLogs: AdminAuditLog[]
  messages: Message[]
  onSendMessage: (input: {
    title: string
    content: string
    messageType: 'Announcement' | 'Event Reminder' | 'Personal' | 'Emergency'
    recipientIds: string[]
  }) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  onLogout: () => void
}

const dateText = (value: string) =>
  new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const badgeClass = (status: SubmissionStatus) => {
  if (status === 'Approved') return 'badge badge-approved'
  return 'badge badge-pending'
}

const badgeIcon = (status: SubmissionStatus) => {
  if (status === 'Approved') return '✅'
  return '⏳'
}

type EditDraft = {
  fullName: string
  middleName: string
  gender: 'Male' | 'Female' | 'Other'
  age: string
  birthdate: string
  registrationDate: string
  contactNumber: string
  address: string
  guardianContact: string
  emergencyContactPerson: string
  emergencyContactNumber: string
}

type AccountDraft = {
  fullName: string
  email: string
  password: string
  role: 0 | 1
}

type EditAccountDraft = {
  fullName: string
  email: string
  password: string
  role: 0 | 1
}

const toEditDraft = (submission: Submission): EditDraft => ({
  fullName: submission.fullName,
  middleName: submission.middleName,
  gender: submission.gender ?? 'Other',
  age: String(submission.age),
  birthdate: submission.birthdate,
  registrationDate: submission.registrationDate,
  contactNumber: submission.contactNumber,
  address: submission.address,
  guardianContact: submission.guardianContact,
  emergencyContactPerson: submission.emergencyContactPerson,
  emergencyContactNumber: submission.emergencyContactNumber,
})

const STATUS_COLORS = ['#4ba3c7', '#6f5bd3', '#d46bd5', '#d76565', '#e2cf56']

const darkenHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, Math.floor(parseInt(clean.slice(0, 2), 16) * factor)))
  const g = Math.max(0, Math.min(255, Math.floor(parseInt(clean.slice(2, 4), 16) * factor)))
  const b = Math.max(0, Math.min(255, Math.floor(parseInt(clean.slice(4, 6), 16) * factor)))
  return `rgb(${r}, ${g}, ${b})`
}

export function List({
  loading,
  submissions,
  onUpdateStatus,
  onEditSubmission,
  onDeleteSubmission,
  activities,
  onCreateActivity,
  onEditActivity,
  onUpdateActivityStatus,
  onDeleteActivity,
  accounts,
  currentAdminId,
  onCreateAccount,
  onEditAccount,
  onDeleteAccount,
  auditLogs,
  messages,
  onSendMessage,
  onDeleteMessage,
  onLogout,
}: ListProps) {
  const [activeTab, setActiveTab] = useState<'registrations' | 'analytics' | 'activities' | 'settings' | 'messages'>('registrations')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | SubmissionStatus>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [selected, setSelected] = useState<Submission | null>(null)
  const [working, setWorking] = useState(false)
  const [closingModal, setClosingModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [activityDraft, setActivityDraft] = useState({
    title: '',
    details: '',
    eventDate: '',
    location: '',
    status: 'Published' as ActivityStatus,
  })
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [editingActivityDraft, setEditingActivityDraft] = useState<{
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  } | null>(null)
  const [accountDraft, setAccountDraft] = useState<AccountDraft>({
    fullName: '',
    email: '',
    password: '',
    role: 0,
  })
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editingAccountDraft, setEditingAccountDraft] = useState<EditAccountDraft | null>(null)
  const [messageDraft, setMessageDraft] = useState({
    title: '',
    content: '',
    messageType: 'Announcement' as 'Announcement' | 'Event Reminder' | 'Personal' | 'Emergency',
    recipientIds: [] as string[],
  })
  const [messageComposingActive, setMessageComposingActive] = useState(false)
  const [messageWorking, setMessageWorking] = useState(false)

  const messageRecipients = useMemo(
    () => accounts.filter((account) => account.id !== currentAdminId),
    [accounts, currentAdminId],
  )

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((r) => r.status === 'Pending').length,
      approved: submissions.filter((r) => r.status === 'Approved').length,
    }
  }, [submissions])

  const analytics = useMemo(() => {
    const total = submissions.length
    const status = {
      approved: submissions.filter((row) => row.status === 'Approved').length,
      pending: submissions.filter((row) => row.status === 'Pending').length,
    }

    const approvalRate = total ? Math.round((status.approved / total) * 100) : 0
    const pendingRate = total ? Math.round((status.pending / total) * 100) : 0
    const avgAge = total
      ? Math.round((submissions.reduce((sum, row) => sum + (Number.isFinite(row.age) ? row.age : 0), 0) / total) * 10) / 10
      : 0

    const genderMap = new Map<string, number>()
    const ageBuckets = {
      '12 and below': 0,
      '13-15': 0,
      '16-18': 0,
      '19-21': 0,
      '22+': 0,
    }

    for (const row of submissions) {
      const gender = row.gender || 'Not Set'
      genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1)

      if (row.age <= 12) ageBuckets['12 and below'] += 1
      else if (row.age <= 15) ageBuckets['13-15'] += 1
      else if (row.age <= 18) ageBuckets['16-18'] += 1
      else if (row.age <= 21) ageBuckets['19-21'] += 1
      else ageBuckets['22+'] += 1
    }

    const statusSegments = [
      { key: 'approved', label: 'Approved', count: status.approved },
      { key: 'pending', label: 'Pending', count: status.pending },
    ]
      .filter((item) => item.count > 0)
      .map((item, index) => ({
        ...item,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
        shade: darkenHex(STATUS_COLORS[index % STATUS_COLORS.length], 0.72),
        pct: total ? Math.round((item.count / total) * 100) : 0,
      }))

    const genders = [...genderMap.entries()]
      .map(([label, count]) => ({
        label,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const ages = Object.entries(ageBuckets).map(([label, count]) => ({
      label,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    }))

    const now = new Date()
    const monthBuckets: { key: string; label: string; count: number }[] = []
    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthBuckets.push({
        key,
        label: d.toLocaleString('en-PH', { month: 'short' }),
        count: 0,
      })
    }

    for (const row of submissions) {
      const date = new Date(row.createdAt)
      if (Number.isNaN(date.getTime())) continue
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthBuckets.find((item) => item.key === key)
      if (bucket) bucket.count += 1
    }

    let cumulative = 0
    const monthlyRegistrations = monthBuckets.map((item) => {
      cumulative += item.count
      return {
        label: item.label,
        count: item.count,
        cumulative,
      }
    })

    const msDay = 1000 * 60 * 60 * 24
    const recentStart = now.getTime() - 30 * msDay
    const prevStart = now.getTime() - 60 * msDay
    const recent30 = submissions.filter((row) => {
      const t = new Date(row.createdAt).getTime()
      return t >= recentStart
    }).length
    const previous30 = submissions.filter((row) => {
      const t = new Date(row.createdAt).getTime()
      return t >= prevStart && t < recentStart
    }).length
    const growthPct = previous30 === 0 ? (recent30 > 0 ? 100 : 0) : Math.round(((recent30 - previous30) / previous30) * 100)

    return {
      total,
      approvalRate,
      pendingRate,
      avgAge,
      recent30,
      growthPct,
      statusSegments,
      genders,
      ages,
      monthlyRegistrations,
    }
  }, [submissions])

  const pieLabel = (props: {
    x?: number
    y?: number
    name?: string | number
    value?: string | number
    percent?: number
  }) => {
    const x = props.x ?? 0
    const y = props.y ?? 0
    const name = String(props.name ?? '')
    const value = Number(props.value ?? 0)
    const pct = props.percent ? Math.round(props.percent * 100) : 0
    return (
      <text x={x} y={y} fill="#2e6442" fontSize={11} textAnchor="middle" dominantBaseline="central">
        {`${name} ${value} (${pct}%)`}
      </text>
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let items = submissions.filter((row) => {
      if (!q) return true
      return (
        row.fullName.toLowerCase().includes(q) ||
        row.contactNumber.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q) ||
        row.emergencyContactPerson.toLowerCase().includes(q)
      )
    })

    if (statusFilter) {
      items = items.filter((row) => row.status === statusFilter)
    }

    if (sortBy === 'oldest') {
      items = [...items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    } else if (sortBy === 'name') {
      items = [...items].sort((a, b) => a.fullName.localeCompare(b.fullName))
    } else {
      items = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }

    return items
  }, [search, statusFilter, sortBy, submissions])

  const exportExcel = () => {
    if (!submissions.length) return

    const rows = submissions.map((row, index) => ({
      '#': index + 1,
      'Full Name': row.fullName,
      'Middle Name': row.middleName,
      Gender: row.gender,
      Age: row.age,
      Birthdate: row.birthdate,
      Address: row.address,
      'Contact Number': row.contactNumber,
      'Guardian Contact': row.guardianContact,
      'Emergency Person': row.emergencyContactPerson,
      'Emergency Number': row.emergencyContactNumber,
      Status: row.status,
      'Submitted At': dateText(row.createdAt),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 22 },
      { wch: 12 },
      { wch: 6 },
      { wch: 14 },
      { wch: 40 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 12 },
      { wch: 22 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Youth Registrations')
    XLSX.writeFile(wb, `Youth_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportPDF = () => {
    if (!submissions.length) return

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFillColor(15, 96, 32)
    doc.rect(0, 0, 297, 26, 'F')
    doc.setFillColor(141, 214, 49)
    doc.rect(0, 23, 297, 3, 'F')
    doc.setTextColor(245, 225, 24)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('ST. JOSEPH THE WORKER CHAPEL', 148, 10, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text('Youth Ministry - Registration Report', 148, 17, { align: 'center' })

    autoTable(doc, {
      startY: 35,
      head: [[
        '#',
        'Full Name',
        'Middle Name',
        'Gender',
        'Age',
        'Birthdate',
        'Address',
        'Contact',
        'Guardian',
        'Emergency Person',
        'Emergency No.',
        'Status',
      ]],
      body: submissions.map((row, index) => [
        index + 1,
        row.fullName,
        row.middleName,
        row.gender,
        row.age,
        row.birthdate,
        row.address,
        row.contactNumber,
        row.guardianContact,
        row.emergencyContactPerson,
        row.emergencyContactNumber,
        row.status,
      ]),
      styles: { fontSize: 7.2, cellPadding: 2.6 },
      headStyles: { fillColor: [15, 96, 32], textColor: [245, 225, 24] },
      alternateRowStyles: { fillColor: [240, 250, 242] },
      margin: { left: 10, right: 10 },
    })

    doc.save(`Youth_Registrations_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const updateStatus = async (status: SubmissionStatus) => {
    if (!selected) return
    setWorking(true)
    try {
      await onUpdateStatus(selected.id, status)
      setSelected({ ...selected, status })
      closeModal()
    } finally {
      setWorking(false)
    }
  }

  const closeModal = () => {
    if (!selected || closingModal) return
    setClosingModal(true)
    window.setTimeout(() => {
      setSelected(null)
      setEditing(false)
      setEditDraft(null)
      setClosingModal(false)
    }, 220)
  }

  const openView = (row: Submission) => {
    setClosingModal(false)
    setSelected(row)
    setEditing(false)
    setEditDraft(null)
  }

  const startEditing = (row: Submission) => {
    setSelected(row)
    setEditing(true)
    setEditDraft(toEditDraft(row))
  }

  const setDraftValue = (field: keyof EditDraft, value: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }

  const saveEdit = async () => {
    if (!selected || !editDraft) return

    const age = Number(editDraft.age)
    if (!Number.isFinite(age) || age <= 0) {
      window.alert('Please enter a valid age')
      return
    }

    setWorking(true)
    try {
      const updated = await onEditSubmission(selected.id, {
        fullName: editDraft.fullName.trim(),
        middleName: editDraft.middleName.trim(),
        gender: editDraft.gender,
        age: Math.floor(age),
        birthdate: editDraft.birthdate,
        registrationDate: editDraft.registrationDate,
        contactNumber: editDraft.contactNumber.trim(),
        address: editDraft.address.trim(),
        guardianContact: editDraft.guardianContact.trim(),
        emergencyContactPerson: editDraft.emergencyContactPerson.trim(),
        emergencyContactNumber: editDraft.emergencyContactNumber.trim(),
      })
      setSelected(updated)
      setEditing(false)
      setEditDraft(null)
      closeModal()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update submission')
    } finally {
      setWorking(false)
    }
  }

  const deleteSelected = async (id: string) => {
    const shouldDelete = window.confirm('Delete this submission permanently?')
    if (!shouldDelete) return

    setWorking(true)
    try {
      await onDeleteSubmission(id)
      if (selected?.id === id) {
        closeModal()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete submission')
    } finally {
      setWorking(false)
    }
  }

  const submitActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activityDraft.title || !activityDraft.details || !activityDraft.eventDate || !activityDraft.location) {
      window.alert('Please complete all activity fields')
      return
    }

    setWorking(true)
    try {
      await onCreateActivity(activityDraft)
      setActivityDraft({
        title: '',
        details: '',
        eventDate: '',
        location: '',
        status: 'Published',
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to add activity')
    } finally {
      setWorking(false)
    }
  }

  const removeActivity = async (id: string) => {
    const shouldDelete = window.confirm('Delete this activity?')
    if (!shouldDelete) return

    setWorking(true)
    try {
      await onDeleteActivity(id)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete activity')
    } finally {
      setWorking(false)
    }
  }

  const beginActivityEdit = (activity: Activity) => {
    setEditingActivityId(activity.id)
    setEditingActivityDraft({
      title: activity.title,
      details: activity.details,
      eventDate: activity.eventDate,
      location: activity.location,
      status: activity.status,
    })
  }

  const cancelActivityEdit = () => {
    setEditingActivityId(null)
    setEditingActivityDraft(null)
  }

  const saveActivityEdit = async (id: string) => {
    if (!editingActivityDraft) return
    setWorking(true)
    try {
      await onEditActivity(id, editingActivityDraft)
      cancelActivityEdit()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update activity')
    } finally {
      setWorking(false)
    }
  }

  const changeActivityStatus = async (id: string, status: ActivityStatus) => {
    setWorking(true)
    try {
      await onUpdateActivityStatus(id, status)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update activity status')
    } finally {
      setWorking(false)
    }
  }

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!messageDraft.title.trim() || !messageDraft.content.trim() || messageDraft.recipientIds.length === 0) {
      window.alert('Please fill in all fields and select at least one recipient')
      return
    }

    setMessageWorking(true)
    try {
      await onSendMessage({
        title: messageDraft.title.trim(),
        content: messageDraft.content.trim(),
        messageType: messageDraft.messageType,
        recipientIds: messageDraft.recipientIds,
      })
      setMessageDraft({
        title: '',
        content: '',
        messageType: 'Announcement',
        recipientIds: [],
      })
      setMessageComposingActive(false)
      window.alert('Message sent successfully!')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setMessageWorking(false)
    }
  }

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accountDraft.fullName.trim() || !accountDraft.email.trim() || !accountDraft.password.trim()) {
      window.alert('Please complete full name, email, and password')
      return
    }
    if (accountDraft.password.trim().length < 6) {
      window.alert('Password must be at least 6 characters')
      return
    }

    setWorking(true)
    try {
      await onCreateAccount({
        fullName: accountDraft.fullName.trim(),
        email: accountDraft.email.trim().toLowerCase(),
        password: accountDraft.password.trim(),
        role: accountDraft.role,
      })
      setAccountDraft({ fullName: '', email: '', password: '', role: 0 })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setWorking(false)
    }
  }

  const beginAccountEdit = (account: AdminAccount) => {
    setEditingAccountId(account.id)
    setEditingAccountDraft({
      fullName: account.fullName,
      email: account.email,
      password: '',
      role: account.role,
    })
  }

  const cancelAccountEdit = () => {
    setEditingAccountId(null)
    setEditingAccountDraft(null)
  }

  const saveAccountEdit = async (id: string) => {
    if (!editingAccountDraft) return

    const payload: {
      fullName?: string
      email?: string
      password?: string
      role?: 0 | 1
    } = {
      fullName: editingAccountDraft.fullName.trim(),
      email: editingAccountDraft.email.trim().toLowerCase(),
      role: editingAccountDraft.role,
    }

    const password = editingAccountDraft.password.trim()
    if (password) {
      if (password.length < 6) {
        window.alert('Password must be at least 6 characters')
        return
      }
      payload.password = password
    }

    setWorking(true)
    try {
      await onEditAccount(id, payload)
      cancelAccountEdit()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update account')
    } finally {
      setWorking(false)
    }
  }

  const removeAccount = async (account: AdminAccount) => {
    if (account.id === currentAdminId) {
      window.alert('You cannot delete your own account')
      return
    }

    const shouldDelete = window.confirm(`Delete account for ${account.email}?`)
    if (!shouldDelete) return

    setWorking(true)
    try {
      await onDeleteAccount(account.id)
      if (editingAccountId === account.id) {
        cancelAccountEdit()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete account')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sb-logo">
          <div className="sb-cross">✝</div>
          <div>
            <div className="sb-title">St. Joseph<br />the Worker</div>
            <div className="sb-sub">Admin Panel</div>
          </div>
        </div>
        <div className="sb-nav">
          <button
            type="button"
            className={`sb-item ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            <span className="ico">📋</span><span>Registrations</span>
          </button>
          <button
            type="button"
            className={`sb-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span className="ico">📊</span><span>Analytics</span>
          </button>
          <button
            type="button"
            className={`sb-item ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <span className="ico">📅</span><span>Activities</span>
          </button>
          <button
            type="button"
            className={`sb-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <span className="ico">💬</span><span>Messages</span>
          </button>
          <button
            type="button"
            className={`sb-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="ico">⚙️</span><span>Settings</span>
          </button>
        </div>
        <div className="sb-stats">
          <div className="sb-stat"><span className="sb-stat-label">Total</span><span className="sb-stat-val">{stats.total}</span></div>
          <div className="sb-stat"><span className="sb-stat-label">Pending</span><span className="sb-stat-val">{stats.pending}</span></div>
        </div>
        <div className="sb-footer">
          <button type="button" className="sb-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="main">
        {activeTab === 'registrations' ? (
          <>
            <div className="topbar">
              <div>
                <div className="page-title">Youth <span>Registrations</span></div>
                <div className="page-sub">Review and manage all submitted youth information forms</div>
              </div>
              <div className="export-group">
                <button className="btn btn-excel" onClick={exportExcel}>📊 Export Excel</button>
                <button className="btn btn-pdf" onClick={exportPDF}>📄 Export PDF</button>
              </div>
            </div>

            <div className="stat-row">
              <Card icon="👥" value={stats.total} label="Total Registrations" variant="total" />
              <Card icon="⏳" value={stats.pending} label="Pending Review" variant="pending" />
              <Card icon="✅" value={stats.approved} label="Approved" variant="approved" />
            </div>

            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-ico">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, contact, address..."
                />
              </div>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | SubmissionStatus)}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
              </select>
              <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            <div className="table-wrap">
              <div className="table-head">
                <div className="th-title">📋 Registration Records</div>
                <div className="rec-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
              </div>

              {loading && (
                <div className="table-skeleton">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                </div>
              )}

              {!loading && !!filtered.length && (
                <div className="scroll-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Member</th>
                        <th>Age</th>
                        <th>Contact</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, index) => (
                        <tr key={row.id}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="avatar-cell">
                              <div className="avatar-mini">
                                {row.photoData ? <img src={row.photoData} alt={row.fullName} /> : <span>🙂</span>}
                              </div>
                              <div>
                                <div className="name-text">{row.fullName}</div>
                                <div className="date-text">{row.address}</div>
                              </div>
                            </div>
                          </td>
                          <td>{row.age}</td>
                          <td>{row.contactNumber}</td>
                          <td>{dateText(row.createdAt)}</td>
                          <td><span className={badgeClass(row.status)}>{badgeIcon(row.status)} {row.status}</span></td>
                          <td>
                            <div className="action-group">
                              <button className="action-btn" onClick={() => openView(row)}>View</button>
                              <button className="action-btn action-btn-edit" onClick={() => startEditing(row)}>Edit</button>
                              <button
                                className="action-btn action-btn-delete"
                                disabled={working}
                                onClick={() => {
                                  void deleteSelected(row.id)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && !filtered.length && (
                <div className="empty-state">
                  <div className="es-ico">📭</div>
                  <p>No registrations found.</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'activities' ? (
          <>
            <div className="topbar">
              <div>
                <div className="page-title">Youth <span>Activities</span></div>
                <div className="page-sub">Create activities that are shown on the user side</div>
              </div>
            </div>

            <div className="activity-admin-grid">
              <form className="activity-admin-form" onSubmit={(event) => void submitActivity(event)}>
                <h3>Add Activity</h3>
                <label>
                  Title
                  <input
                    type="text"
                    value={activityDraft.title}
                    onChange={(event) => setActivityDraft((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Youth Camp 2026"
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={activityDraft.eventDate}
                    onChange={(event) => setActivityDraft((prev) => ({ ...prev, eventDate: event.target.value }))}
                  />
                </label>
                <label>
                  Location
                  <input
                    type="text"
                    value={activityDraft.location}
                    onChange={(event) => setActivityDraft((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="SJWC Covered Court"
                  />
                </label>
                <label>
                  Status
                  <select
                    value={activityDraft.status}
                    onChange={(event) =>
                      setActivityDraft((prev) => ({
                        ...prev,
                        status: event.target.value as ActivityStatus,
                      }))
                    }
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </label>
                <label>
                  Details
                  <textarea
                    value={activityDraft.details}
                    onChange={(event) => setActivityDraft((prev) => ({ ...prev, details: event.target.value }))}
                    placeholder="Schedule, dress code, and what to bring"
                  />
                </label>
                <button type="submit" className="btn btn-excel" disabled={working}>Save Activity</button>
              </form>

              <div className="activity-admin-list">
                <h3>Posted Activities ({activities.length})</h3>
                {activities.length === 0 ? (
                  <p className="activity-empty">No activities posted yet.</p>
                ) : (
                  <div className="activity-items">
                    {activities.map((activity) => (
                      <article key={activity.id} className="activity-item">
                        {editingActivityId === activity.id && editingActivityDraft ? (
                          <>
                            <div className="activity-item-top">
                              <strong>Editing Activity</strong>
                            </div>
                            <div className="activity-edit-grid">
                              <input
                                type="text"
                                value={editingActivityDraft.title}
                                onChange={(event) =>
                                  setEditingActivityDraft((prev) =>
                                    prev ? { ...prev, title: event.target.value } : prev,
                                  )
                                }
                                placeholder="Title"
                              />
                              <input
                                type="date"
                                value={editingActivityDraft.eventDate}
                                onChange={(event) =>
                                  setEditingActivityDraft((prev) =>
                                    prev ? { ...prev, eventDate: event.target.value } : prev,
                                  )
                                }
                              />
                              <input
                                type="text"
                                value={editingActivityDraft.location}
                                onChange={(event) =>
                                  setEditingActivityDraft((prev) =>
                                    prev ? { ...prev, location: event.target.value } : prev,
                                  )
                                }
                                placeholder="Location"
                              />
                              <select
                                value={editingActivityDraft.status}
                                onChange={(event) =>
                                  setEditingActivityDraft((prev) =>
                                    prev
                                      ? { ...prev, status: event.target.value as ActivityStatus }
                                      : prev,
                                  )
                                }
                              >
                                <option value="Published">Published</option>
                                <option value="Draft">Draft</option>
                                <option value="Archived">Archived</option>
                              </select>
                              <textarea
                                value={editingActivityDraft.details}
                                onChange={(event) =>
                                  setEditingActivityDraft((prev) =>
                                    prev ? { ...prev, details: event.target.value } : prev,
                                  )
                                }
                                placeholder="Details"
                              />
                            </div>
                            <div className="activity-action-row">
                              <button
                                type="button"
                                className="action-btn action-btn-edit"
                                disabled={working}
                                onClick={() => {
                                  void saveActivityEdit(activity.id)
                                }}
                              >
                                Save
                              </button>
                              <button type="button" className="action-btn" onClick={cancelActivityEdit}>
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="activity-item-top">
                              <strong>{activity.title}</strong>
                              <span className={`activity-status-badge ${activity.status.toLowerCase()}`}>
                                {activity.status}
                              </span>
                            </div>
                            <div className="activity-meta">{activity.eventDate} • {activity.location}</div>
                            <p>{activity.details}</p>
                            <div className="activity-action-row">
                              <button
                                type="button"
                                className="action-btn action-btn-edit"
                                disabled={working}
                                onClick={() => beginActivityEdit(activity)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                disabled={working || activity.status === 'Published'}
                                onClick={() => {
                                  void changeActivityStatus(activity.id, 'Published')
                                }}
                              >
                                Publish
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                disabled={working || activity.status === 'Archived'}
                                onClick={() => {
                                  void changeActivityStatus(activity.id, 'Archived')
                                }}
                              >
                                Archive
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn-delete"
                                disabled={working}
                                onClick={() => {
                                  void removeActivity(activity.id)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'settings' ? (
          <>
            <div className="topbar">
              <div>
                <div className="page-title">Account <span>Settings</span></div>
                <div className="page-sub">Manage admin and user accounts (create, read, update, delete)</div>
              </div>
            </div>

            <div className="settings-grid">
              <form className="settings-form" onSubmit={(event) => void submitAccount(event)}>
                <h3>Create Account</h3>
                <label>
                  Full Name
                  <input
                    type="text"
                    value={accountDraft.fullName}
                    onChange={(event) => setAccountDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Juan Dela Cruz"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={accountDraft.email}
                    onChange={(event) => setAccountDraft((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={accountDraft.password}
                    onChange={(event) => setAccountDraft((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </label>
                <label>
                  Role
                  <select
                    value={String(accountDraft.role)}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({
                        ...prev,
                        role: Number(event.target.value) === 1 ? 1 : 0,
                      }))
                    }
                  >
                    <option value="0">User</option>
                    <option value="1">Admin</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-excel" disabled={working}>Create Account</button>
              </form>

              <section className="settings-list">
                <h3>Existing Accounts ({accounts.length})</h3>
                {accounts.length === 0 ? (
                  <p className="activity-empty">No accounts found.</p>
                ) : (
                  <div className="settings-items">
                    {accounts.map((account) => {
                      const isEditing = editingAccountId === account.id && editingAccountDraft
                      return (
                        <article key={account.id} className="settings-item">
                          {isEditing ? (
                            <>
                              <div className="settings-edit-grid">
                                <input
                                  type="text"
                                  value={editingAccountDraft.fullName}
                                  onChange={(event) =>
                                    setEditingAccountDraft((prev) =>
                                      prev ? { ...prev, fullName: event.target.value } : prev,
                                    )
                                  }
                                  placeholder="Full name"
                                />
                                <input
                                  type="email"
                                  value={editingAccountDraft.email}
                                  onChange={(event) =>
                                    setEditingAccountDraft((prev) =>
                                      prev ? { ...prev, email: event.target.value } : prev,
                                    )
                                  }
                                  placeholder="Email"
                                />
                                <input
                                  type="password"
                                  value={editingAccountDraft.password}
                                  onChange={(event) =>
                                    setEditingAccountDraft((prev) =>
                                      prev ? { ...prev, password: event.target.value } : prev,
                                    )
                                  }
                                  placeholder="Leave blank to keep current password"
                                />
                                <select
                                  value={String(editingAccountDraft.role)}
                                  onChange={(event) =>
                                    setEditingAccountDraft((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            role: Number(event.target.value) === 1 ? 1 : 0,
                                          }
                                        : prev,
                                    )
                                  }
                                >
                                  <option value="0">User</option>
                                  <option value="1">Admin</option>
                                </select>
                              </div>
                              <div className="activity-action-row">
                                <button
                                  type="button"
                                  className="action-btn action-btn-edit"
                                  disabled={working}
                                  onClick={() => {
                                    void saveAccountEdit(account.id)
                                  }}
                                >
                                  Save
                                </button>
                                <button type="button" className="action-btn" onClick={cancelAccountEdit}>
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="settings-item-top">
                                <strong>{account.fullName}</strong>
                                <span className={`account-role ${account.role === 1 ? 'admin' : 'user'}`}>
                                  {account.role === 1 ? 'Admin' : 'User'}
                                </span>
                              </div>
                              <div className="activity-meta">{account.email}</div>
                              <div className="activity-meta">Created: {dateText(account.createdAt)}</div>
                              <div className="activity-action-row">
                                <button
                                  type="button"
                                  className="action-btn action-btn-edit"
                                  disabled={working}
                                  onClick={() => beginAccountEdit(account)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="action-btn action-btn-delete"
                                  disabled={working || account.id === currentAdminId}
                                  onClick={() => {
                                    void removeAccount(account)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : activeTab === 'messages' ? (
          <>
            <div className="topbar">
              <div>
                <div className="page-title">Communication <span>Messages</span></div>
                <div className="page-sub">Send announcements and messages to youth and members</div>
              </div>
              {!messageComposingActive && (
                <button className="btn btn-excel" onClick={() => setMessageComposingActive(true)}>
                  ✉️ Compose Message
                </button>
              )}
            </div>

            <div className="settings-grid">
              {messageComposingActive && (
                <form className="settings-form" onSubmit={(event) => void submitMessage(event)}>
                  <h3>Compose Message</h3>
                  <label>
                    Title
                    <input
                      type="text"
                      value={messageDraft.title}
                      onChange={(event) =>
                        setMessageDraft((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Message title or subject"
                    />
                  </label>
                  <label>
                    Message Type
                    <select
                      value={messageDraft.messageType}
                      onChange={(event) =>
                        setMessageDraft((prev) => ({
                          ...prev,
                          messageType: event.target.value as 'Announcement' | 'Event Reminder' | 'Personal' | 'Emergency',
                        }))
                      }
                    >
                      <option value="Announcement">Announcement</option>
                      <option value="Event Reminder">Event Reminder</option>
                      <option value="Personal">Personal</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </label>
                  <label>
                    Content
                    <textarea
                      value={messageDraft.content}
                      onChange={(event) =>
                        setMessageDraft((prev) => ({ ...prev, content: event.target.value }))
                      }
                      placeholder="Type your message here..."
                      rows={6}
                    />
                  </label>
                  <label>
                    Recipients (select at least one)
                    <div className="recipient-checkboxes">
                      {messageRecipients.length === 0 ? (
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>No recipients available</p>
                      ) : (
                        messageRecipients.map((recipient) => (
                          <label key={recipient.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={messageDraft.recipientIds.includes(recipient.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setMessageDraft((prev) => ({
                                    ...prev,
                                    recipientIds: [...prev.recipientIds, recipient.id],
                                  }))
                                } else {
                                  setMessageDraft((prev) => ({
                                    ...prev,
                                    recipientIds: prev.recipientIds.filter((id) => id !== recipient.id),
                                  }))
                                }
                              }}
                            />
                            <span>
                              {recipient.fullName} <span style={{ color: '#999', fontSize: '0.85rem' }}>({recipient.email})</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-excel" disabled={messageWorking}>
                      Send Message
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setMessageComposingActive(false)
                        setMessageDraft({
                          title: '',
                          content: '',
                          messageType: 'Announcement',
                          recipientIds: [],
                        })
                      }}
                      style={{ background: '#ddd', color: '#333' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <section className="settings-list">
                <h3>Sent Messages ({messages.length})</h3>
                {messages.length === 0 ? (
                  <p className="activity-empty">No messages sent yet.</p>
                ) : (
                  <div className="settings-items">
                    {messages.map((msg) => (
                      <article
                        key={msg._id}
                        className="settings-item"
                        style={{
                          borderLeft: `4px solid ${
                            msg.messageType === 'Emergency'
                              ? '#e74c3c'
                              : msg.messageType === 'Announcement'
                                ? '#3498db'
                                : msg.messageType === 'Event Reminder'
                                  ? '#f39c12'
                                  : '#2ecc71'
                          }`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{msg.title}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                            Type: <strong>{msg.messageType}</strong> • Recipients: <strong>{msg.recipientIds.length}</strong> • Read by:{' '}
                            <strong>{msg.readBy.length}</strong>
                          </div>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: '#999',
                              display: 'flex',
                              gap: '16px',
                            }}
                          >
                            <span>Sent: {dateText(msg.createdAt)}</span>
                          </div>
                        </div>
                        <div className="activity-action-row">
                          <button
                            type="button"
                            className="action-btn action-btn-delete"
                            disabled={working}
                            onClick={() => {
                              setWorking(true)
                              void onDeleteMessage(msg._id).finally(() => setWorking(false))
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <>
            <div className="topbar">
              <div>
                <div className="page-title">Registration <span>Analytics</span></div>
                <div className="page-sub">Live metrics based on submitted registration records</div>
              </div>
            </div>

            <div className="analytics-kpi-grid">
              <article className="analytics-kpi-card">
                <span>Total Registrations</span>
                <strong>{analytics.total}</strong>
                <small>{analytics.recent30} in last 30 days</small>
              </article>
              <article className="analytics-kpi-card">
                <span>Approval Rate</span>
                <strong>{analytics.approvalRate}%</strong>
                <small>{analytics.pendingRate}% pending</small>
              </article>
              <article className="analytics-kpi-card">
                <span>Average Age</span>
                <strong>{analytics.avgAge || 0}</strong>
                <small>Across all submitted records</small>
              </article>
              <article className="analytics-kpi-card">
                <span>30-Day Growth</span>
                <strong>{analytics.growthPct > 0 ? `+${analytics.growthPct}` : analytics.growthPct}%</strong>
                <small>Compared to previous 30 days</small>
              </article>
            </div>

            <div className="analytics-grid">
              <section className="analytics-card analytics-pie-card">
                <h3>3D Pie: Registration Status</h3>
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart margin={{ top: 8, right: 20, left: 20, bottom: 12 }}>
                      <Pie
                        data={analytics.statusSegments}
                        dataKey="count"
                        cx="50%"
                        cy="53%"
                        innerRadius={68}
                        outerRadius={122}
                        paddingAngle={3}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {analytics.statusSegments.map((entry) => (
                          <Cell key={`depth-${entry.key}`} fill={entry.shade} />
                        ))}
                      </Pie>
                      <Pie
                        data={analytics.statusSegments}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="49%"
                        innerRadius={68}
                        outerRadius={122}
                        paddingAngle={3}
                        labelLine={false}
                        label={pieLabel}
                        startAngle={90}
                        endAngle={-270}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {analytics.statusSegments.map((entry) => (
                          <Cell key={`top-${entry.key}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="chart-total-pill">
                    <strong>{analytics.total}</strong>
                    <span>Total Users</span>
                  </div>
                </div>
              </section>

              <section className="analytics-card">
                <h3>6-Month Registration Trend</h3>
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={analytics.monthlyRegistrations} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d7ebd8" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#356744' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#356744' }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={28} iconType="circle" />
                      <Line type="monotone" dataKey="count" name="Monthly" stroke="#2f9c5f" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#e7a23a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="analytics-card">
                <h3>Gender Distribution</h3>
                {analytics.genders.length ? (
                  <div className="chart-frame">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.genders} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d7ebd8" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#356744' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#356744' }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#56a8d1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="activity-empty">No gender data yet.</p>
                )}
              </section>

              <section className="analytics-card analytics-age-card">
                <h3>Age Distribution</h3>
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.ages} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d7ebd8" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#356744' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#356744' }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#7ac65a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="analytics-card analytics-logs-card">
                <h3>Recent Admin Activity Logs</h3>
                {auditLogs.length ? (
                  <div className="audit-log-list">
                    {auditLogs.slice(0, 10).map((log) => (
                      <article key={log.id} className="audit-log-item">
                        <div className="audit-log-top">
                          <strong>{log.action}</strong>
                          <span>{new Date(log.createdAt).toLocaleString('en-PH')}</span>
                        </div>
                        <p>{log.summary || `${log.entityType} ${log.entityId}`}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="activity-empty">No audit logs yet.</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      <div className={`modal-overlay ${selected ? 'modal-visible' : ''} ${closingModal ? 'closing' : ''}`} onClick={closeModal}>
        {selected && (
          <div className={`modal ${closingModal ? 'closing' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selected.fullName}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="m-photo-row">
                <div className="m-avatar">
                  <div className="m-avatar-inner">
                    {selected.photoData ? <img src={selected.photoData} alt={selected.fullName} /> : <span>🙂</span>}
                  </div>
                </div>
                <div>
                  <div className="m-name">{selected.fullName}</div>
                  <div className="m-date">Submitted: {dateText(selected.createdAt)}</div>
                  <div className={badgeClass(selected.status)}>{badgeIcon(selected.status)} {selected.status}</div>
                </div>
              </div>

              <div className="m-grid">
                {editing && editDraft ? (
                  <>
                    <InputField label="Full Name" value={editDraft.fullName} onChange={(value) => setDraftValue('fullName', value)} />
                    <InputField label="Middle Name" value={editDraft.middleName} onChange={(value) => setDraftValue('middleName', value)} />
                    <SelectInputField
                      label="Gender"
                      value={editDraft.gender}
                      onChange={(value) => setDraftValue('gender', value as EditDraft['gender'])}
                      options={['Male', 'Female', 'Other']}
                    />
                    <InputField label="Age" type="number" value={editDraft.age} onChange={(value) => setDraftValue('age', value)} />
                    <InputField label="Birthdate" type="date" value={editDraft.birthdate} onChange={(value) => setDraftValue('birthdate', value)} />
                    <InputField label="Registration Date" type="date" value={editDraft.registrationDate} onChange={(value) => setDraftValue('registrationDate', value)} />
                    <InputField label="Contact Number" value={editDraft.contactNumber} onChange={(value) => setDraftValue('contactNumber', value)} />
                    <InputField label="Address" value={editDraft.address} onChange={(value) => setDraftValue('address', value)} full />
                    <InputField label="Guardian Contact" value={editDraft.guardianContact} onChange={(value) => setDraftValue('guardianContact', value)} />
                    <InputField label="Emergency Person" value={editDraft.emergencyContactPerson} onChange={(value) => setDraftValue('emergencyContactPerson', value)} />
                    <InputField label="Emergency Number" value={editDraft.emergencyContactNumber} onChange={(value) => setDraftValue('emergencyContactNumber', value)} />
                  </>
                ) : (
                  <>
                    <Field label="Middle Name" value={selected.middleName} />
                    <Field label="Gender" value={selected.gender} />
                    <Field label="Age" value={`${selected.age} years old`} />
                    <Field label="Birthdate" value={selected.birthdate} />
                    <Field label="Address" value={selected.address} full />
                    <Field label="Contact Number" value={selected.contactNumber} />
                    <Field label="Guardian Contact" value={selected.guardianContact} />
                    <Field label="Emergency Person" value={selected.emergencyContactPerson} />
                    <Field label="Emergency Number" value={selected.emergencyContactNumber} />
                  </>
                )}
              </div>

              <div className="m-status-row">
                {editing ? (
                  <>
                    <div className="m-status-label">Save Changes:</div>
                    <button className="status-btn btn-approve" disabled={working} onClick={() => void saveEdit()}>💾 Save</button>
                    <button
                      className="status-btn btn-pending"
                      disabled={working}
                      onClick={() => {
                        setEditing(false)
                        setEditDraft(null)
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="m-status-label">Update Status:</div>
                    <button className="status-btn btn-approve" disabled={working} onClick={() => updateStatus('Approved')}>✅ Approve</button>
                    <button className="status-btn btn-reject" disabled={working} onClick={() => void deleteSelected(selected.id)}>🗑 Delete</button>
                    <button className="status-btn btn-pending" disabled={working} onClick={() => updateStatus('Pending')}>⏳ Set Pending</button>
                    <button className="status-btn btn-edit" disabled={working} onClick={() => startEditing(selected)}>✏️ Edit</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
  full?: boolean
}

function Field({ label, value, full }: FieldProps) {
  return (
    <div className={`m-field ${full ? 'full' : ''}`}>
      <div className="m-label">{label}</div>
      <div className="m-val">{value || '—'}</div>
    </div>
  )
}

type InputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'date'
  full?: boolean
}

function InputField({ label, value, onChange, type = 'text', full }: InputFieldProps) {
  return (
    <div className={`m-field ${full ? 'full' : ''}`}>
      <div className="m-label">{label}</div>
      <input
        className="m-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

type SelectInputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  full?: boolean
}

function SelectInputField({ label, value, onChange, options, full }: SelectInputFieldProps) {
  return (
    <div className={`m-field ${full ? 'full' : ''}`}>
      <div className="m-label">{label}</div>
      <select className="m-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
