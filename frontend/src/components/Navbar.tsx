import React, { useState } from 'react'

export function Navbar() {
  const [activeSection, setActiveSection] = useState('section-status')

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  const navItems = [
    { id: 'section-status', label: '📊 概览', icon: '📊' },
    { id: 'section-teacher', label: '👨‍🏫 教师工具', icon: '👨‍🏫' },
    { id: 'section-checkin', label: '📱 学生签到', icon: '📱' },
    { id: 'section-courses', label: '📚 课程管理', icon: '📚' },
    { id: 'section-records', label: '📋 出勤记录', icon: '📋' },
    { id: 'section-reports', label: '📈 统计报表', icon: '📈' }
  ]

  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          NFT 出勤 DApp
        </div>
        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={activeSection === item.id ? 'active' : ''}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label.replace(item.icon + ' ', '')}</span>
            </button>
          ))}
        </nav>
        <div className="navbar-decoration">
          <div className="glow-effect"></div>
        </div>
      </div>
    </div>
  )
}


