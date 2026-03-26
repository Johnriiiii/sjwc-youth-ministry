import { useMemo, useState } from 'react'
import type { Activity } from '../types'

type ActivityFeedProps = {
  activities: Activity[]
  loading?: boolean
}

const todayKey = new Date().toISOString().slice(0, 10)
const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  })

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'month'>('upcoming')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayKey)

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

  const monthCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const firstWeekday = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells: Array<{ date: Date; dateKey: string; inMonth: boolean }> = []

    for (let index = firstWeekday - 1; index >= 0; index -= 1) {
      const day = daysInPrevMonth - index
      const date = new Date(year, month - 1, day)
      cells.push({ date, dateKey: toDateKey(date), inMonth: false })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      cells.push({ date, dateKey: toDateKey(date), inMonth: true })
    }

    while (cells.length % 7 !== 0 || cells.length < 35) {
      const nextIndex = cells.length - (firstWeekday + daysInMonth) + 1
      const date = new Date(year, month + 1, nextIndex)
      cells.push({ date, dateKey: toDateKey(date), inMonth: false })
    }

    return cells
  }, [calendarMonth])

  const selectedDateActivities = groupedByDate.find(([date]) => date === selectedDate)?.[1] ?? []

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
          <div className="calendar-header">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
            >
              Prev
            </button>
            <div className="calendar-month-label">{formatMonthYear(calendarMonth)}</div>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
            >
              Next
            </button>
          </div>

          <div className="calendar-grid-wrap">
            <div className="calendar-weekdays">
              {weekLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {monthCells.map((cell) => {
                const dayActivities = groupedByDate.find(([date]) => date === cell.dateKey)?.[1] ?? []
                const isToday = cell.dateKey === todayKey
                const isSelected = cell.dateKey === selectedDate

                return (
                  <button
                    type="button"
                    key={cell.dateKey}
                    className={`calendar-cell${cell.inMonth ? '' : ' muted'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedDate(cell.dateKey)}
                  >
                    <span className="calendar-day-number">{cell.date.getDate()}</span>
                    {dayActivities.length > 0 ? (
                      <span className="calendar-dot" title={`${dayActivities.length} activities`}>
                        {dayActivities.length}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="activity-calendar-day">
            <div className="activity-calendar-date">{formatDate(selectedDate)}</div>
            <div className="activity-calendar-items">
              {selectedDateActivities.length === 0 ? (
                <div className="activity-feed-empty">No activities on this date.</div>
              ) : (
                selectedDateActivities.map((activity) => (
                  <article key={activity.id} className="activity-calendar-item">
                    <strong>{activity.title}</strong>
                    <span>{activity.location}</span>
                    <p>{activity.details}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
