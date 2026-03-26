import { useEffect, useState } from 'react'
import './App.css'
import { AuthPanel } from './components/AuthPanel'
import { ActivityFeed } from './components/ActivityFeed'
import { Form } from './components/Form'
import { Header } from './components/Header'
import { List } from './components/List'
import { ProfileCard } from './components/ProfileCard'
import {
  clearToken,
  createAdminActivity,
  createAdminUser,
  createSubmission,
  deleteAdminActivity,
  deleteAdminUser,
  deleteAdminSubmission,
  listActivities,
  listAdminAuditLogs,
  listAdminActivities,
  listMySubmissions,
  listAdminSubmissions,
  listAdminUsers,
  login,
  me,
  readToken,
  saveToken,
  signup,
  updateAdminActivity,
  updateAdminActivityStatus,
  updateAdminSubmission,
  updateAdminUser,
  updateSubmissionStatus,
} from './services/api'
import type {
  Activity,
  ActivityStatus,
  AdminAccount,
  AdminAuditLog,
  AuthUser,
  Submission,
  SubmissionStatus,
  YouthFormInput,
} from './types'

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [myLatestSubmission, setMyLatestSubmission] = useState<Submission | null>(null)
  const [booting, setBooting] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [signupPopupVisible, setSignupPopupVisible] = useState(false)

  const isAdmin = authUser?.role === 1

  useEffect(() => {
    const token = readToken()
    if (!token) {
      setBooting(false)
      return
    }

    me(token)
      .then(({ user }) => setAuthUser(user))
      .catch(() => {
        clearToken()
        setAuthUser(null)
      })
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (!authUser) {
      setSubmissions([])
      setActivities([])
      setAuditLogs([])
      setAccounts([])
      setMyLatestSubmission(null)
      return
    }

    const token = readToken()
    if (!token) return

    setDataLoading(true)

    if (authUser.role === 0) {
      Promise.all([listMySubmissions(token), listActivities()])
        .then(([myRows, activityRows]) => {
          setMyLatestSubmission(myRows.submissions[0] ?? null)
          setActivities(activityRows.activities)
        })
        .catch((error) => setToast(error.message || 'Failed to load your profile details'))
        .finally(() => setDataLoading(false))
      return
    }

    Promise.all([listAdminSubmissions(token), listAdminActivities(token), listAdminAuditLogs(token), listAdminUsers(token)])
      .then(([submissionRows, activityRows, logRows, userRows]) => {
        setSubmissions(submissionRows.submissions)
        setActivities(activityRows.activities)
        setAuditLogs(logRows.logs)
        setAccounts(userRows.users)
      })
      .catch((error) => setToast(error.message || 'Failed to load submissions'))
      .finally(() => setDataLoading(false))
  }, [authUser])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!signupPopupVisible) return
    const timer = window.setTimeout(() => setSignupPopupVisible(false), 2400)
    return () => window.clearTimeout(timer)
  }, [signupPopupVisible])

  const onSignup = async (input: {
    fullName: string
    email: string
    password: string
  }) => {
    setLoading(true)
    try {
      const { token, user } = await signup(input)
      saveToken(token)
      setAuthUser(user)
      setToast('You are signed up!')
      setSignupPopupVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const onLogin = async (input: { email: string; password: string }) => {
    setLoading(true)
    try {
      const { token, user } = await login(input)
      saveToken(token)
      setAuthUser(user)
      setToast('Login successful')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitForm = async (input: YouthFormInput) => {
    const token = readToken()
    if (!token) {
      setToast('Please login first')
      return
    }

    setLoading(true)
    try {
      const { submission } = await createSubmission(token, input)
      setMyLatestSubmission(submission)
      setToast('Registration submitted successfully')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Submission failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const onUpdateStatus = async (id: string, status: SubmissionStatus) => {
    const token = readToken()
    if (!token) return

    const { submission } = await updateSubmissionStatus(token, id, status)
    setSubmissions((prev) => prev.map((item) => (item.id === id ? submission : item)))
    setToast(`Status updated to ${status}`)
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onEditSubmission = async (
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
  ) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { submission } = await updateAdminSubmission(token, id, input)
    setSubmissions((prev) => prev.map((item) => (item.id === id ? submission : item)))
    setToast('Submission details updated')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
    return submission
  }

  const onDeleteSubmission = async (id: string) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    await deleteAdminSubmission(token, id)
    setSubmissions((prev) => prev.filter((item) => item.id !== id))
    setToast('Submission deleted')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onCreateActivity = async (input: {
    title: string
    details: string
    eventDate: string
    location: string
    status: ActivityStatus
  }) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { activity } = await createAdminActivity(token, input)
    setActivities((prev) => [activity, ...prev])
    setToast('Activity posted')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onEditActivity = async (
    id: string,
    input: {
      title: string
      details: string
      eventDate: string
      location: string
      status: ActivityStatus
    },
  ) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { activity } = await updateAdminActivity(token, id, input)
    setActivities((prev) => prev.map((item) => (item.id === id ? activity : item)))
    setToast('Activity updated')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onUpdateActivityStatus = async (id: string, status: ActivityStatus) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { activity } = await updateAdminActivityStatus(token, id, status)
    setActivities((prev) => prev.map((item) => (item.id === id ? activity : item)))
    setToast(`Activity set to ${status}`)
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onDeleteActivity = async (id: string) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    await deleteAdminActivity(token, id)
    setActivities((prev) => prev.filter((item) => item.id !== id))
    setToast('Activity deleted')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onCreateAccount = async (input: {
    fullName: string
    email: string
    password: string
    role: 0 | 1
  }) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { user } = await createAdminUser(token, input)
    setAccounts((prev) => [user, ...prev])
    setToast('Account created')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onEditAccount = async (
    id: string,
    input: {
      fullName?: string
      email?: string
      password?: string
      role?: 0 | 1
    },
  ) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    const { user } = await updateAdminUser(token, id, input)
    setAccounts((prev) => prev.map((item) => (item.id === id ? user : item)))
    setToast('Account updated')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onDeleteAccount = async (id: string) => {
    const token = readToken()
    if (!token) throw new Error('Please login first')

    await deleteAdminUser(token, id)
    setAccounts((prev) => prev.filter((item) => item.id !== id))
    setToast('Account deleted')
    const logs = await listAdminAuditLogs(token)
    setAuditLogs(logs.logs)
  }

  const onLogout = () => {
    clearToken()
    setAuthUser(null)
    setSubmissions([])
    setActivities([])
    setAuditLogs([])
    setAccounts([])
    setMyLatestSubmission(null)
    setToast('Logged out')
  }

  if (booting) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <div className="app-shell">
      <div className="wave-bg" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4db84e" />
              <stop offset="60%" stopColor="#2ca83a" />
              <stop offset="100%" stopColor="#1a7a2e" />
            </linearGradient>
            <linearGradient id="w1" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#8dd631" />
              <stop offset="100%" stopColor="#5bb832" />
            </linearGradient>
            <linearGradient id="w2" x1="0.2" y1="0" x2="1" y2="0.8">
              <stop offset="0%" stopColor="#b8e800" />
              <stop offset="100%" stopColor="#7ecb35" />
            </linearGradient>
            <linearGradient id="w3" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#f0e010" />
              <stop offset="50%" stopColor="#c8d800" />
              <stop offset="100%" stopColor="#a8cc00" />
            </linearGradient>
            <linearGradient id="w4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ec832" />
              <stop offset="100%" stopColor="#3da840" />
            </linearGradient>
            <linearGradient id="w5" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8f020" />
              <stop offset="100%" stopColor="#b0d800" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#bg)" />
          <path
            className="wave-layer"
            d="M -100 -60 C 180 80, 400 -30, 600 140 C 800 310, 750 480, 950 440 C 1150 400, 1300 200, 1540 260 L 1540 -100 L -100 -100 Z"
            fill="url(#w4)"
            opacity="0.85"
          />
          <path
            className="wave-layer"
            d="M -80 200 C 120 100, 320 260, 520 210 C 720 160, 820 380, 1060 330 C 1260 285, 1380 100, 1540 160 L 1540 -10 L -80 -10 Z"
            fill="url(#w1)"
            opacity="0.72"
          />
          <path
            className="wave-layer"
            d="M -60 480 C 150 360, 340 530, 560 470 C 760 415, 880 600, 1100 545 C 1280 500, 1420 360, 1540 420 L 1540 -10 L -60 -10 Z"
            fill="url(#w2)"
            opacity="0.62"
          />
          <path
            className="wave-layer"
            d="M -100 750 C 80 600, 260 720, 420 640 C 580 560, 620 700, 780 660 C 900 630, 940 720, 1020 700 C 1080 685, 1060 800, 940 820 C 780 845, 500 780, 300 800 C 160 815, 60 870, -100 900 Z"
            fill="url(#w3)"
            opacity="0.88"
          />
          <path
            className="wave-layer"
            d="M 1000 -80 C 1100 40, 1240 -20, 1540 80 L 1540 -100 Z"
            fill="url(#w5)"
            opacity="0.7"
          />
          <path
            className="wave-layer"
            d="M 200 900 C 300 780, 480 840, 600 760 C 720 680, 780 780, 900 730 C 1020 680, 1100 750, 1240 700 C 1360 655, 1460 720, 1540 680 L 1540 900 Z"
            fill="url(#w1)"
            opacity="0.55"
          />
        </svg>
      </div>

      {!authUser ? (
        <>
          <Header />
          <AuthPanel loading={loading} onSignup={onSignup} onLogin={onLogin} />
        </>
      ) : (
        <>
          <Header subtitle={isAdmin ? 'Admin Access' : 'Youth Ministry'} />
          {isAdmin ? (
            <List
              loading={dataLoading}
              submissions={submissions}
              onUpdateStatus={onUpdateStatus}
              onEditSubmission={onEditSubmission}
              onDeleteSubmission={onDeleteSubmission}
              activities={activities}
              onCreateActivity={onCreateActivity}
              onEditActivity={onEditActivity}
              onUpdateActivityStatus={onUpdateActivityStatus}
              onDeleteActivity={onDeleteActivity}
              accounts={accounts}
              currentAdminId={authUser.id}
              onCreateAccount={onCreateAccount}
              onEditAccount={onEditAccount}
              onDeleteAccount={onDeleteAccount}
              auditLogs={auditLogs}
              onLogout={onLogout}
            />
          ) : (
            <>
              <ProfileCard user={authUser} />
              <ActivityFeed activities={activities} loading={dataLoading} />
              {myLatestSubmission ? (
                <section className="card submitted-profile-card">
                  <div className="card-accent"></div>
                  <div className="form-title">Your Submitted Information</div>
                  <div className="form-desc">You have already completed the youth information form.</div>

                  <div className="submitted-photo-wrap">
                    <div className="submitted-photo-ring">
                      <img src={myLatestSubmission.photoData} alt={`${myLatestSubmission.fullName} profile`} />
                    </div>
                  </div>

                  <div className="submitted-grid">
                    <Detail label="Full Name" value={myLatestSubmission.fullName} />
                    <Detail label="Middle Name" value={myLatestSubmission.middleName} />
                    <Detail label="Gender" value={myLatestSubmission.gender || 'Not Set'} />
                    <Detail label="Age" value={String(myLatestSubmission.age)} />
                    <Detail label="Birthdate" value={myLatestSubmission.birthdate} />
                    <Detail label="Contact Number" value={myLatestSubmission.contactNumber} />
                    <Detail label="Address" value={myLatestSubmission.address} full />
                    <Detail label="Parents/Guardian Contact" value={myLatestSubmission.guardianContact} />
                    <Detail label="Emergency Contact Person" value={myLatestSubmission.emergencyContactPerson} />
                    <Detail label="Emergency Contact Number" value={myLatestSubmission.emergencyContactNumber} />
                  </div>

                  <div className="user-logout-bottom">
                    <button type="button" onClick={onLogout}>Logout</button>
                  </div>
                </section>
              ) : (
                <Form loading={loading} onSubmit={onSubmitForm} />
              )}
            </>
          )}
        </>
      )}

      <div className={`signup-popup ${signupPopupVisible ? 'show' : ''}`} aria-live="polite">
        <div className="signup-popup-mark">✓</div>
        <div>
          <strong>You are signed up!</strong>
          <p>Welcome to SJWC Youth Ministry.</p>
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

type DetailProps = {
  label: string
  value: string
  full?: boolean
}

function Detail({ label, value, full }: DetailProps) {
  return (
    <div className={`submitted-detail ${full ? 'full' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
