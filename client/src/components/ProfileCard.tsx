import type { AuthUser } from '../types'

type ProfileCardProps = {
  user: AuthUser
  onLogout?: () => void
}

export function ProfileCard({ user, onLogout }: ProfileCardProps) {
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <section className="profile-card-wrap" aria-label="My Profile">
      <div className="profile-glow"></div>
      <article className="profile-card-main">
        <div className="profile-avatar-big">{initials || 'SJ'}</div>
        <div className="profile-content">
          <p className="profile-label">My Profile</p>
          <h2>{user.fullName}</h2>
          <p>{user.email}</p>
          <span className="profile-role">{user.role === 1 ? 'Admin Account' : 'Youth User Account'}</span>
        </div>
        {onLogout && (
          <button className="profile-logout-btn" onClick={onLogout} title="Logout">
            🚪
          </button>
        )}
      </article>
    </section>
  )
}
