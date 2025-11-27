import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from './Navbar'
import { CourseManager } from './CourseManager'
import { AttendanceRecords } from './AttendanceRecords'
import { AttendanceReports } from './AttendanceReports'
import { TeacherBatchMint } from './TeacherBatchMint'
import { TeacherAdvancedPanel } from './TeacherAdvancedPanel'

type TeacherTab = 'overview' | 'courses' | 'records' | 'reports' | 'batch-mint' | 'advanced'

export function TeacherDashboard() {
  const { address, userRole, logout, getAuthHeaders, token } = useAuth()
  const [activeTab, setActiveTab] = useState<TeacherTab>('overview')
  const [teacherStats, setTeacherStats] = useState({
    totalCourses: '--',
    activeStudents: '--',
    averageAttendanceRate: '--%'
  })
  const [loadingStats, setLoadingStats] = useState(true)

  const tabs = [
    { id: 'overview' as TeacherTab, label: '概览', icon: '📊' },
    { id: 'courses' as TeacherTab, label: '课程管理', icon: '📚' },
    { id: 'records' as TeacherTab, label: '出勤记录', icon: '📋' },
    { id: 'reports' as TeacherTab, label: '统计报表', icon: '📈' },
    { id: 'batch-mint' as TeacherTab, label: '批量铸造', icon: '🎓' },
    { id: 'advanced' as TeacherTab, label: '高级功能', icon: '🛠️' }
  ]

  // 获取教师统计数据
  const fetchTeacherStats = async () => {
    try {
      console.log('开始获取教师统计数据...')
      console.log('当前用户状态:', { userRole })

      // 检查localStorage中的token
      const savedToken = localStorage.getItem('auth_token')
      const savedRole = localStorage.getItem('user_role')
      console.log('localStorage状态:', { savedToken: !!savedToken, savedRole })

      // 首先获取教师的课程列表
      const headers = getAuthHeaders()
      console.log('发送请求头:', headers)

      const coursesResponse = await fetch('http://localhost:4000/api/courses', {
        headers: headers
      })

      console.log('课程列表响应:', coursesResponse.status)

      if (coursesResponse.ok) {
        const teacherCourses = await coursesResponse.json()
        console.log('教师课程:', teacherCourses)

        if (teacherCourses.length > 0) {
          // 计算总课程数
          const totalCourses = teacherCourses.length

          // 获取所有课程的统计数据
          const courseStatsResponse = await fetch('http://localhost:4000/api/reports/course-stats', {
            headers: getAuthHeaders()
          })

          console.log('课程统计响应:', courseStatsResponse.status)

          if (courseStatsResponse.ok) {
            const allCourseStats = await courseStatsResponse.json()
            console.log('所有课程统计:', allCourseStats)

            // 过滤出当前教师的课程统计
            const teacherCourseStats = allCourseStats.filter((courseStat: any) =>
              teacherCourses.some((course: any) => course.id === courseStat.courseId)
            )

            console.log('教师课程统计:', teacherCourseStats)

            // 计算活跃学生数和平均出勤率
            const studentSet = new Set<string>()
            let totalAttendanceRecords = 0
            let totalPossibleAttendance = 0

            teacherCourseStats.forEach((courseStat: any) => {
              if (courseStat.attendanceRecords) {
                courseStat.attendanceRecords.forEach((record: any) => {
                  // 收集所有有出勤记录的学生（通过sessionId作为唯一标识）
                  if (record.presentCount > 0) {
                    studentSet.add(`session_${record.sessionId}`)
                  }
                  totalAttendanceRecords += record.presentCount || 0
                  totalPossibleAttendance += record.totalCount || 0
                })
              }
            })

            const activeStudents = studentSet.size

            // 计算平均出勤率
            const averageAttendanceRate = totalPossibleAttendance > 0
              ? ((totalAttendanceRecords / totalPossibleAttendance) * 100).toFixed(1)
              : '0.0'

            console.log('计算结果:', { totalCourses, activeStudents, averageAttendanceRate })

            setTeacherStats({
              totalCourses: totalCourses.toString(),
              activeStudents: activeStudents.toString(),
              averageAttendanceRate: `${averageAttendanceRate}%`
            })
          } else {
            console.error('获取课程统计失败')
            setTeacherStats({
              totalCourses: totalCourses.toString(),
              activeStudents: '0',
              averageAttendanceRate: '0.0%'
            })
          }
        } else {
          // 没有课程
          console.log('教师没有课程')
          setTeacherStats({
            totalCourses: '0',
            activeStudents: '0',
            averageAttendanceRate: '0.0%'
          })
        }
      } else {
        console.error('获取课程列表失败:', coursesResponse.status)
        const errorText = await coursesResponse.text()
        console.error('错误详情:', errorText)
      }
    } catch (error) {
      console.error('获取教师统计数据失败:', error)
      setTeacherStats({
        totalCourses: '0',
        activeStudents: '0',
        averageAttendanceRate: '0.0%'
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    if (address && token && userRole) {
      console.log('触发获取教师统计数据 - address:', address, 'token:', !!token, 'userRole:', userRole)
      fetchTeacherStats()
    } else {
      console.log('跳过获取教师统计数据 - 条件不满足:', { address: !!address, token: !!token, userRole })
    }
  }, [address, token, userRole])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-content">
            <div className="welcome-section">
              <div className="welcome-header">
                <div className="welcome-icon">👨‍🏫</div>
                <div className="welcome-text">
                  <h1>教师控制台</h1>
                  <p>欢迎回来，教师！在这里管理您的课程和学生出勤数据</p>
                </div>
              </div>
              <div className="user-info-card teacher-card">
                <div className="user-avatar teacher-avatar">
                  👨‍🏫
                </div>
                <div className="user-details">
                  <h3>教师账户</h3>
                  <p className="user-address">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="user-role">角色：教师</p>
                </div>
                <button className="logout-btn" onClick={() => logout()}>
                  <span className="button-icon">🚪</span>
                  退出登录
                </button>
              </div>
            </div>

            <div className="overview-grid teacher-grid">
              <div className="overview-card featured">
                <div className="card-header">
                  <div className="card-icon">📚</div>
                  <h3>课程管理</h3>
                </div>
                <p>创建新课程、添加课次、设置出勤规则</p>
                <button
                  className="action-btn primary large"
                  onClick={() => setActiveTab('courses')}
                >
                  <span className="button-icon">🚀</span>
                  进入管理
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">🎓</div>
                  <h3>批量铸造</h3>
                </div>
                <p>为学生批量铸造出勤NFT，建立区块链凭证</p>
                <button
                  className="action-btn secondary"
                  onClick={() => setActiveTab('batch-mint')}
                >
                  <span className="button-icon">⚡</span>
                  开始铸造
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">📋</div>
                  <h3>出勤记录</h3>
                </div>
                <p>查看所有学生的出勤情况和NFT状态</p>
                <button
                  className="action-btn secondary"
                  onClick={() => setActiveTab('records')}
                >
                  <span className="button-icon">📊</span>
                  查看记录
                </button>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">📈</div>
                  <h3>数据统计</h3>
                </div>
                <p>查看详细的出勤统计和分析报告</p>
                <button
                  className="action-btn secondary"
                  onClick={() => setActiveTab('reports')}
                >
                  <span className="button-icon">📈</span>
                  查看报表
                </button>
              </div>
            </div>

            <div className="quick-stats teacher-stats">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : teacherStats.totalCourses}
                  </div>
                  <div className="stat-label">总课程数</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : teacherStats.activeStudents}
                  </div>
                  <div className="stat-label">活跃学生</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {loadingStats ? '...' : teacherStats.averageAttendanceRate}
                  </div>
                  <div className="stat-label">平均出勤率</div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'courses':
        return (
          <div className="dashboard-content">
            <CourseManager onCourseUpdate={() => fetchTeacherStats()} />
          </div>
        )

      case 'records':
        return (
          <div className="dashboard-content">
            <AttendanceRecords />
          </div>
        )

      case 'reports':
        return (
          <div className="dashboard-content">
            <AttendanceReports />
          </div>
        )

      case 'batch-mint':
        return (
          <div className="dashboard-content">
            <TeacherBatchMint />
          </div>
        )

      case 'advanced':
        return (
          <div className="dashboard-content">
            <TeacherAdvancedPanel />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="teacher-dashboard">
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>教师面板</h2>
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
