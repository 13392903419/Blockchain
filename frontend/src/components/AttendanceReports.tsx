import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const API = 'http://localhost:4000'

type CourseStats = {
  courseId: string
  courseName: string
  totalSessions: number
  totalStudents: number
  averageAttendanceRate: number
  attendanceRecords: Array<{
    sessionId: string
    sessionName: string
    attendanceRate: number
    presentCount: number
    totalCount: number
  }>
}

type StudentStats = {
  studentAddress: string
  totalSessions: number
  attendedSessions: number
  attendanceRate: number
  attendanceHistory: Array<{
    sessionId: string
    sessionName: string
    courseName: string
    status: 'present' | 'absent'
    timestamp: number
  }>
}

type TimeStats = {
  period: string
  totalSessions: number
  totalAttendance: number
  averageRate: number
  trends: Array<{
    date: string
    sessions: number
    attendance: number
    rate: number
  }>
}

export function AttendanceReports() {
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
  const [activeTab, setActiveTab] = useState<'course' | 'student' | 'time'>('course')
  const [courseStats, setCourseStats] = useState<CourseStats[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null)
  const [loading, setLoading] = useState(false)

  const loadCourseStats = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/reports/course-stats`, {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setCourseStats(data)
    } catch (error) {
      console.error('加载课程统计失败:', error)
      setCourseStats([])
    } finally {
      setLoading(false)
    }
  }

  const loadStudentStats = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/reports/student-stats`, {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setStudentStats(data)
    } catch (error) {
      console.error('加载学生统计失败:', error)
      setStudentStats([])
    } finally {
      setLoading(false)
    }
  }

  const loadTimeStats = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/reports/time-stats`, {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setTimeStats(data)
    } catch (error) {
      console.error('加载时间统计失败:', error)
      setTimeStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'course') loadCourseStats()
    else if (activeTab === 'student') loadStudentStats()
    else if (activeTab === 'time') loadTimeStats()
  }, [activeTab, isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="attendance-reports-container">
        <div className="auth-required-card">
          <div className="auth-icon">🔒</div>
          <h3>需要登录</h3>
          <p>请先连接钱包并登录以查看统计报表</p>
          <button className="auth-button" onClick={login}>
            <span className="button-icon">🔑</span>
            连接钱包登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="attendance-reports-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-icon">📊</div>
        <div className="header-content">
          <h2>出勤统计报表</h2>
          <p>多维度分析出勤数据，掌握教学效果和学生参与情况</p>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="reports-tabs">
        <button
          className={`tab-button ${activeTab === 'course' ? 'active' : ''}`}
          onClick={() => setActiveTab('course')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-text">按课程统计</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
          onClick={() => setActiveTab('student')}
        >
          <span className="tab-icon">👨‍🎓</span>
          <span className="tab-text">按学生统计</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'time' ? 'active' : ''}`}
          onClick={() => setActiveTab('time')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-text">按时间统计</span>
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <p>正在加载统计数据...</p>
        </div>
      )}

      {/* 课程统计 */}
      {activeTab === 'course' && !loading && (
        <div className="report-section">
          <div className="section-header">
            <div className="section-icon">📚</div>
            <h3>课程出勤统计</h3>
            <div className="courses-count">
              <span className="count-badge">{courseStats.length}</span>
              <span className="count-label">个课程</span>
            </div>
          </div>

          {courseStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h4>暂无课程数据</h4>
              <p>请先创建课程并录入出勤记录</p>
            </div>
          ) : (
            <>
              {/* 课程统计卡片概览 */}
              <div className="stats-overview">
                <div className="overview-card">
                  <div className="overview-icon">📚</div>
                  <div className="overview-content">
                    <div className="overview-number">{courseStats.length}</div>
                    <div className="overview-label">总课程数</div>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">🕒</div>
                  <div className="overview-content">
                    <div className="overview-number">
                      {courseStats.reduce((sum, course) => sum + course.totalSessions, 0)}
                    </div>
                    <div className="overview-label">总课次数</div>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">👥</div>
                  <div className="overview-content">
                    <div className="overview-number">
                      {courseStats.reduce((sum, course) => sum + course.totalStudents, 0)}
                    </div>
                    <div className="overview-label">累计学生数</div>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">📈</div>
                  <div className="overview-content">
                    <div className="overview-number">
                      {courseStats.length > 0
                        ? (courseStats.reduce((sum, course) => sum + course.averageAttendanceRate, 0) / courseStats.length).toFixed(1)
                        : '0.0'
                      }%
                    </div>
                    <div className="overview-label">平均出勤率</div>
                  </div>
                </div>
              </div>

              {/* 课程详细表格 */}
              <div className="table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>课程名称</th>
                      <th>课次总数</th>
                      <th>学生总数</th>
                      <th>平均出勤率</th>
                      <th>出勤趋势</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseStats.map((course, index) => (
                      <tr key={course.courseId} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                        <td className="course-name-cell">
                          <div className="course-name">{course.courseName}</div>
                        </td>
                        <td className="data-cell">
                          <div className="data-value">{course.totalSessions}</div>
                          <div className="data-label">课次</div>
                        </td>
                        <td className="data-cell">
                          <div className="data-value">{course.totalStudents}</div>
                          <div className="data-label">学生</div>
                        </td>
                        <td className="rate-cell">
                          <div className={`rate-badge ${course.averageAttendanceRate >= 80 ? 'excellent' :
                                                      course.averageAttendanceRate >= 60 ? 'good' : 'poor'}`}>
                            {course.averageAttendanceRate.toFixed(1)}%
                          </div>
                        </td>
                        <td className="trend-cell">
                          <div className="mini-bar">
                            <div
                              className="mini-bar-fill"
                              style={{
                                width: `${Math.min(course.averageAttendanceRate, 100)}%`,
                                background: course.averageAttendanceRate >= 80 ? '#22c55e' :
                                           course.averageAttendanceRate >= 60 ? '#f59e0b' : '#ef4444'
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 学生统计 */}
      {activeTab === 'student' && !loading && (
        <div className="report-section">
          <div className="section-header">
            <div className="section-icon">👨‍🎓</div>
            <h3>学生出勤统计</h3>
            <div className="students-count">
              <span className="count-badge">{studentStats.length}</span>
              <span className="count-label">个学生</span>
            </div>
          </div>

          {studentStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍🎓</div>
              <h4>暂无学生数据</h4>
              <p>学生出勤记录将在这里显示</p>
            </div>
          ) : (
            <>
              {/* 学生统计概览 */}
              <div className="stats-overview">
                <div className="overview-card">
                  <div className="overview-icon">👥</div>
                  <div className="overview-content">
                    <div className="overview-number">{studentStats.length}</div>
                    <div className="overview-label">活跃学生</div>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">✅</div>
                  <div className="overview-content">
                    <div className="overview-number">
                      {studentStats.reduce((sum, student) => sum + student.attendedSessions, 0)}
                    </div>
                    <div className="overview-label">总出勤次数</div>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">📊</div>
                  <div className="overview-content">
                    <div className="overview-number">
                      {studentStats.length > 0
                        ? (studentStats.reduce((sum, student) => sum + student.attendanceRate, 0) / studentStats.length).toFixed(1)
                        : '0.0'
                      }%
                    </div>
                    <div className="overview-label">平均出勤率</div>
                  </div>
                </div>
              </div>

              {/* 学生详细表格 */}
              <div className="table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>学生地址</th>
                      <th>参与课次</th>
                      <th>出勤次数</th>
                      <th>出勤率</th>
                      <th>表现等级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((student, index) => (
                      <tr key={student.studentAddress} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                        <td className="student-cell">
                          <div className="student-address">
                            <code>{student.studentAddress.slice(0, 6)}...{student.studentAddress.slice(-4)}</code>
                            <button
                              className="copy-button"
                              onClick={() => navigator.clipboard.writeText(student.studentAddress)}
                              title="复制完整地址"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="data-cell">
                          <div className="data-value">{student.totalSessions}</div>
                          <div className="data-label">课次</div>
                        </td>
                        <td className="data-cell">
                          <div className="data-value">{student.attendedSessions}</div>
                          <div className="data-label">出勤</div>
                        </td>
                        <td className="rate-cell">
                          <div className={`rate-badge ${student.attendanceRate >= 80 ? 'excellent' :
                                                      student.attendanceRate >= 60 ? 'good' : 'poor'}`}>
                            {student.attendanceRate.toFixed(1)}%
                          </div>
                        </td>
                        <td className="grade-cell">
                          <div className={`grade-badge ${student.attendanceRate >= 90 ? 'excellent' :
                                                        student.attendanceRate >= 80 ? 'good' :
                                                        student.attendanceRate >= 70 ? 'average' : 'poor'}`}>
                            {student.attendanceRate >= 90 ? '优秀' :
                             student.attendanceRate >= 80 ? '良好' :
                             student.attendanceRate >= 70 ? '一般' : '需改进'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 时间统计 */}
      {activeTab === 'time' && !loading && (
        <div className="report-section">
          <div className="section-header">
            <div className="section-icon">📅</div>
            <h3>时间维度统计</h3>
          </div>

          {!timeStats ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h4>暂无时间统计数据</h4>
              <p>时间统计数据将在这里显示</p>
            </div>
          ) : (
            <>
              {/* 时间统计概览卡片 */}
              <div className="time-stats-grid">
                <div className="time-stat-card">
                  <div className="stat-card-icon">🕒</div>
                  <div className="stat-card-content">
                    <div className="stat-card-number">{timeStats.totalSessions}</div>
                    <div className="stat-card-label">总课次</div>
                  </div>
                </div>
                <div className="time-stat-card">
                  <div className="stat-card-icon">✅</div>
                  <div className="stat-card-content">
                    <div className="stat-card-number">{timeStats.totalAttendance}</div>
                    <div className="stat-card-label">总出勤</div>
                  </div>
                </div>
                <div className="time-stat-card">
                  <div className="stat-card-icon">📈</div>
                  <div className="stat-card-content">
                    <div className="stat-card-number">{timeStats.averageRate.toFixed(1)}%</div>
                    <div className="stat-card-label">平均出勤率</div>
                  </div>
                </div>
              </div>

              {/* 出勤趋势图表 */}
              {timeStats.trends.length > 0 && (
                <div className="trends-section">
                  <div className="section-header">
                    <div className="section-icon">📈</div>
                    <h4>出勤趋势分析</h4>
                    <div className="trends-count">
                      <span className="count-badge">{timeStats.trends.length}</span>
                      <span className="count-label">个数据点</span>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="trends-table">
                      <thead>
                        <tr>
                          <th>日期</th>
                          <th>课次数量</th>
                          <th>出勤人数</th>
                          <th>出勤率</th>
                          <th>趋势指标</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeStats.trends.map((trend, index) => (
                          <tr key={trend.date} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                            <td className="date-cell">
                              <div className="date-display">{trend.date}</div>
                            </td>
                            <td className="data-cell">
                              <div className="data-value">{trend.sessions}</div>
                              <div className="data-label">课次</div>
                            </td>
                            <td className="data-cell">
                              <div className="data-value">{trend.attendance}</div>
                              <div className="data-label">出勤</div>
                            </td>
                            <td className="rate-cell">
                              <div className={`rate-badge ${trend.rate >= 80 ? 'excellent' :
                                                        trend.rate >= 60 ? 'good' : 'poor'}`}>
                                {trend.rate.toFixed(1)}%
                              </div>
                            </td>
                            <td className="trend-cell">
                              <div className="trend-bar">
                                <div
                                  className="trend-bar-fill"
                                  style={{
                                    width: `${Math.min(trend.rate, 100)}%`,
                                    background: trend.rate >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                                               trend.rate >= 60 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                               'linear-gradient(90deg, #ef4444, #dc2626)'
                                  }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
