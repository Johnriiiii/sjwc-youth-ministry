type HeaderProps = {
  subtitle?: string
}

export function Header({ subtitle = 'Youth Ministry' }: HeaderProps) {
  return (
    <header className="header">
      <div className="cross-wrap">
        <div className="cross-bg"></div>
        <div className="cross-icon" aria-hidden="true">
          ✝
        </div>
      </div>
      <div className="chapel-name">St. Joseph the Worker Chapel</div>
      <div className="chapel-tag">✦ {subtitle} ✦</div>
    </header>
  )
}
