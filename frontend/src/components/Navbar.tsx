

export function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          <span className="brand-text">区块链出勤系统</span>
          <span className="brand-subtitle">NFT Attendance DApp</span>
        </div>
        <div className="navbar-decoration">
          <div className="glow-effect"></div>
          <div className="navbar-status">
            <span className="status-dot"></span>
            <span className="status-text">系统在线</span>
          </div>
        </div>
      </div>
    </div>
  )
}
