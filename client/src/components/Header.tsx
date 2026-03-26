type HeaderProps = {
  subtitle?: string
}

export function Header({ subtitle = 'Youth Ministry' }: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-container">
        <img src="/SWJC-YOUTH.png" alt="St. Joseph the Worker Chapel Youth Council" className="logo" />
      </div>
      <div className="header-text">
        <div className="chapel-name">St. Joseph the Worker Chapel</div>
        <div className="chapel-tag">✦ {subtitle} ✦</div>
      </div>
    </header>
  )
}
