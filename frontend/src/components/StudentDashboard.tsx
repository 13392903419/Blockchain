import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from './Navbar'
import { StudentCheckin } from './StudentCheckin'
import { StudentAttendanceRecords } from './StudentAttendanceRecords'
import { Showcase } from './Showcase'
import { StudentWorkMint } from './StudentWorkMint'
import { AccessPassMarket } from './AccessPassMarket'

type StudentTab = 'overview' | 'checkin' | 'records' | 'showcase' | 'work' | 'market'

export function StudentDashboard() {
  const { address, userRole, logout, getAuthHeaders, token } = useAuth()
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
    { id: 'records' as StudentTab, label: '📋 我的记录', icon: '📋' },
    { id: 'showcase' as StudentTab, label: '🎓 我的展示', icon: '🎓' },
    { id: 'work' as StudentTab, label: '🎨 铸造作品', icon: '🎨' },
    { id: 'market' as StudentTab, label: '🎟️ 权益市场', icon: '🎟️' }
  ]

  // 获取学生统计数据
  const fetchStudentStats = async () => {
    try {
      console.log('开始获取学生统计数据...')
      console.log('当前认证状态 - token:', !!token, 'userRole:', userRole, 'address:', address)

      // 检查localStorage中的token
      const savedToken = localStorage.getItem('auth_token')
      const savedRole = localStorage.getItem('user_role')
      console.log('localStorage状态:', { savedToken: !!savedToken, savedRole })

      const headers = getAuthHeaders()
      console.log('请求头:', headers)

      const response = await fetch('http://localhost:4000/api/reports/student-stats', {
        headers: headers
      })

      console.log('学生统计响应:', response.status)

      if (response.ok) {
        const allStats = await response.json()
        console.log('所有学生统计:', allStats)

        const myStats = allStats.find((stat: any) =>
          stat.studentAddress.toLowerCase() === address?.toLowerCase()
        )

        console.log('我的统计:', myStats)

        if (myStats) {
          // 计算今日签到
          const today = new Date().toDateString()
          console.log('今日日期:', today)

          const todayCheckins = myStats.attendanceHistory.filter((record: any) => {
            const recordDate = new Date(record.timestamp).toDateString()
            console.log('记录日期:', recordDate, '状态:', record.status)
            return recordDate === today && record.status === 'present'
          }).length

          // 计算NFT数量（假设每个出勤记录对应一个NFT）
          const nftCount = myStats.attendanceHistory.filter((record: any) =>
            record.status === 'present'
          ).length

          console.log('计算结果:', { todayCheckins, attendanceRate: myStats.attendanceRate, nftCount })

          setStudentStats({
            todayCheckin: todayCheckins.toString(),
            attendanceRate: `${myStats.attendanceRate.toFixed(1)}%`,
            nftCount: nftCount.toString()
          })
        } else {
          console.log('未找到我的统计数据')
          setStudentStats({
            todayCheckin: '0',
            attendanceRate: '0.0%',
            nftCount: '0'
          })
        }
      } else {
        console.error('获取学生统计失败:', response.status)
        const errorText = await response.text()
        console.error('错误详情:', errorText)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      setStudentStats({
        todayCheckin: '0',
        attendanceRate: '0.0%',
        nftCount: '0'
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    if (address && token && userRole) {
      console.log('触发获取学生统计数据 - address:', address, 'token:', !!token, 'userRole:', userRole)
      fetchStudentStats()
    } else {
      console.log('跳过获取统计数据 - 条件不满足:', { address: !!address, token: !!token, userRole })
    }
  }, [address, token, userRole])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-content">
            <div className="welcome-section">
              <div className="welcome-header">
                <div className="welcome-icon">👨‍🎓</div>
                <div className="welcome-text">
                  <h1>学生中心</h1>
                  <p>欢迎使用区块链出勤系统，开启您的数字学习之旅</p>
                </div>
              </div>
              <div className="user-info-card student-card">
                <div className="user-avatar student-avatar">
                  👨‍🎓
                </div>
                <div className="user-details">
                  <h3>学生账户</h3>
                  <p className="user-address">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="user-role">角色：学生</p>
                </div>
                <button className="logout-btn" onClick={() => logout()}>
                  <span className="button-icon">🚪</span>
                  退出登录
                </button>
              </div>
            </div>

            <div className="student-overview-grid">
              <div className="overview-card featured">
                <div className="card-header">
                  <div className="card-icon">📱</div>
                  <h3>出勤查询</h3>
                </div>
                <p>选择课程和课次，查询您的出勤记录</p>
                <button
                  className="action-btn primary large"
                  onClick={() => setActiveTab('checkin')}
                >
                  <span className="button-icon">🔍</span>
                  开始查询
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <h3>我的记录</h3>
                </div>
                <p>查看详细的出勤历史和NFT收藏</p>
                <button
                  className="action-btn secondary"
                  onClick={() => setActiveTab('records')}
                >
                  <span className="button-icon">📋</span>
                  查看记录
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">🎯</div>
                  <h3>学习目标</h3>
                </div>
                <div className="task-list">
                  <div className="task-item">
                    <span className="task-status">⏰</span>
                    <span>及时查询出勤状态</span>
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
                  <div className="stat-label">今日查询</div>
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
                <h3>💪 区块链学习新体验</h3>
                <p>
                  区块链技术让您的每一次出勤都成为永久的数字记录，
                  不只是一次签到，更是一份值得珍藏的学习见证。
                  开启您的区块链学习之旅！
                </p>
                <div className="motivation-tips">
                  <div className="tip">
                    <span className="tip-icon">🎯</span>
                    <span>及时查询，掌握出勤动态</span>
                  </div>
                  <div className="tip">
                    <span className="tip-icon">🔒</span>
                    <span>区块链记录，永久保存</span>
                  </div>
                  <div className="tip">
                    <span className="tip-icon">🏆</span>
                    <span>NFT凭证，数字纪念</span>
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
            <StudentAttendanceRecords />
          </div>
        )

      case 'showcase':
        return (
          <div className="dashboard-content">
            <Showcase />
          </div>
        )

      case 'work':
        return (
          <div className="dashboard-content">
            <StudentWorkMint />
          </div>
        )

      case 'market':
        return (
          <div className="dashboard-content">
            <AccessPassMarket />
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
