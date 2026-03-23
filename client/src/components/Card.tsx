type CardProps = {
  icon: string
  value: number
  label: string
  variant: 'total' | 'pending' | 'approved'
}

export function Card({ icon, value, label, variant }: CardProps) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="sc-ico">{icon}</div>
      <div className="sc-num">{value}</div>
      <div className="sc-label">{label}</div>
    </div>
  )
}
