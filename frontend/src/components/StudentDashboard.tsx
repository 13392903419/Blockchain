import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from './Navbar'
import { StudentCheckin } from './StudentCheckin'
import { AttendanceStatus } from './AttendanceStatus'

type StudentTab = 'overview' | 'checkin' | 'records'

export function StudentDashboard() {
  const { address, userRole, logout, getAuthHeaders } = useAuth()
  const [activeTab, setActiveTab] = useState<StudentTab>('overview')
  const [studentStats, setStudentStats] = useState({
    todayCheckin: '--',
    attendanceRate: '--%',
    nftCount: '--'
  })
  const [loadingStats, setLoadingStats] = useState(true)

  const tabs = [
    { id: 'overview' as StudentTab, label: '📊 概览', icon: '📊' },
    { id: 'checkin' as StudentTab, label: '📱 签到', icon: '📱' },
    { id: 'records' as StudentTab, label: '📋 我的记录', icon: '📋' }
  ]

  // 获取学生统计数据
  const fetchStudentStats = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/reports/student-stats', {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const allStats = await response.json()
        const myStats = allStats.find((stat: any) => stat.studentAddress.toLowerCase() === address?.toLowerCase())

        if (myStats) {
          // 计算今日签到
          const today = new Date().toDateString()
          const todayCheckins = myStats.attendanceHistory.filter((record: any) =>
            new Date(record.timestamp).toDateString() === today && record.status === 'present'
          ).length

          // 计算NFT数量（假设每个出勤记录对应一个NFT）
          const nftCount = myStats.attendanceHistory.filter((record: any) =>
            record.status === 'present'
          ).length

          setStudentStats({
            todayCheckin: todayCheckins.toString(),
            attendanceRate: `${myStats.attendanceRate.toFixed(1)}%`,
            nftCount: nftCount.toString()
          })
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    if (address) {
      fetchStudentStats()
    }
  }, [address])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-content">
            <div className="welcome-section">
              <h1>👨‍🎓 学生中心</h1>
              <p>欢迎使用区块链出勤系统！在这里进行签到并查看您的出勤记录。</p>
              <div className="user-info-card">
                <div className="user-avatar">👨‍🎓</div>
                <div className="user-details">
                  <h3>学生账户</h3>
                  <p className="user-address">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="user-role">角色: {userRole === 'student' ? '学生' : '未知'}</p>
                </div>
                <button className="logout-btn" onClick={logout}>
                  退出登录
                </button>
              </div>
            </div>

            <div className="student-overview-grid">
              <div className="overview-card featured">
                <div className="card-header">
                  <div className="card-icon">📱</div>
                  <h3>快速签到</h3>
                </div>
                <p>点击下方按钮开始今天的签到</p>
                <button
                  className="action-btn primary large"
                  onClick={() => setActiveTab('checkin')}
                >
                  🚀 开始签到
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <h3>出勤概览</h3>
                </div>
                <p>查看您的出勤统计和NFT收集情况</p>
                <button
                  className="action-btn secondary"
                  onClick={() => setActiveTab('records')}
                >
                  查看详情
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">🎯</div>
                  <h3>今日任务</h3>
                </div>
                <div className="task-list">
                  <div className="task-item">
                    <span className="task-status">⏰</span>
                    <span>等待签到时间窗口开启</span>
                  </div>
                  <div className="task-item">
                    <span className="task-status">🎓</span>
                    <span>保持良好出勤记录</span>
                  </div>
                  <div className="task-item">
                    <span className="task-status">🏆</span>
                    <span>收集出勤NFT凭证</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="quick-stats student-stats">
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : studentStats.todayCheckin}
                  </div>
                  <div className="stat-label">今日签到</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : studentStats.attendanceRate}
                  </div>
                  <div className="stat-label">出勤率</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎨</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : studentStats.nftCount}
                  </div>
                  <div className="stat-label">NFT数量</div>
                </div>
              </div>
            </div>

            <div className="motivation-section">
              <div className="motivation-card">
                <h3>💪 保持良好出勤习惯</h3>
                <p>
                  规律的出勤不仅能帮助您获得更好的学习成绩，
                  还能通过区块链技术永久记录您的学习轨迹。
                  每个签到都是您努力的见证！
                </p>
                <div className="motivation-tips">
                  <div className="tip">
                    <span className="tip-icon">🎯</span>
                    <span>准时签到，养成良好习惯</span>
                  </div>
                  <div className="tip">
                    <span className="tip-icon">🔒</span>
                    <span>区块链记录，不可篡改</span>
                  </div>
                  <div className="tip">
                    <span className="tip-icon">🏆</span>
                    <span>NFT凭证，永久保存</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'checkin':
        return (
          <div className="dashboard-content">
            <div className="page-header">
              <h2>📱 学生签到</h2>
              <p>选择课程并在规定时间内完成签到</p>
            </div>
            <StudentCheckin onCheckinSuccess={() => fetchStudentStats()} />
          </div>
        )

      case 'records':
        return (
          <div className="dashboard-content">
            <div className="page-header">
              <h2>📋 我的出勤记录</h2>
              <p>查看您的所有出勤记录和获得的NFT</p>
            </div>
            <AttendanceStatus />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="student-dashboard">
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>学生中心</h2>
          </div>
          <nav className="sidebar-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label.replace(tab.icon + ' ', '')}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="dashboard-main">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
