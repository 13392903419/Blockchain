import React from 'react'

export function Navbar() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="navbar">
      <div className="navbar-left">
        <div className="brand">NFT 出勤 DApp</div>
        <div className="nav-links">
          <button onClick={() => scrollTo('section-status')}>概览</button>
          <button onClick={() => scrollTo('section-teacher')}>教师工具</button>
          <button onClick={() => scrollTo('section-checkin')}>学生签到</button>
          <button onClick={() => scrollTo('section-courses')}>课程管理</button>
          <button onClick={() => scrollTo('section-records')}>出勤记录</button>
          <button onClick={() => scrollTo('section-reports')}>统计报表</button>
        </div>
      </div>
    </div>
  )
}


