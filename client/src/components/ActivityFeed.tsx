import { useMemo, useState } from 'react'
import type { Activity } from '../types'

type ActivityFeedProps = {
  activities: Activity[]
  loading?: boolean
}

const todayKey = new Date().toISOString().slice(0, 10)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'month'>('upcoming')

  const filtered = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return activities.filter((activity) => {
      if (filter === 'all') return true
      if (filter === 'upcoming') return activity.eventDate >= todayKey

      const date = new Date(activity.eventDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
  }, [activities, filter])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Activity[]>()
    for (const activity of filtered) {
      const key = activity.eventDate
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(activity)
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  return (
    <section className="activity-feed card">
      <div className="card-accent"></div>
      <div className="form-title">Upcoming Activities</div>
      <div className="form-desc">Posted by SJWC Youth Ministry admin</div>

      <div className="activity-feed-tools">
        <div className="activity-feed-toggle" role="tablist" aria-label="Activity view mode">
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            type="button"
            className={viewMode === 'calendar' ? 'active' : ''}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
        </div>

        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
          <option value="upcoming">Upcoming</option>
          <option value="month">This Month</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="activity-feed-skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="activity-feed-empty">No activities posted yet.</div>
      ) : viewMode === 'list' ? (
        <div className="activity-feed-list">
          {filtered.map((activity) => (
            <article key={activity.id} className="activity-feed-item">
              <div className="activity-feed-head">
                <h3>{activity.title}</h3>
                <span>{formatDate(activity.eventDate)}</span>
              </div>
              <div className="activity-feed-location">📍 {activity.location}</div>
              <p>{activity.details}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="activity-calendar">
          {groupedByDate.map(([date, dateActivities]) => (
            <div key={date} className="activity-calendar-day">
              <div className="activity-calendar-date">{formatDate(date)}</div>
              <div className="activity-calendar-items">
                {dateActivities.map((activity) => (
                  <article key={activity.id} className="activity-calendar-item">
                    <strong>{activity.title}</strong>
                    <span>{activity.location}</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
