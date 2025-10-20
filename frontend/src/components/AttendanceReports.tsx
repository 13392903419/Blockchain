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
      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
        <h3>出勤统计报表</h3>
        <p>请先登录以查看统计报表</p>
        <button onClick={login} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}>
          登录
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>📊 出勤统计报表</h3>
      
      {/* 标签页 */}
      <div style={{ marginBottom: 20, borderBottom: '1px solid #eee' }}>
        <button
          onClick={() => setActiveTab('course')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'course' ? '#007bff' : 'transparent',
            color: activeTab === 'course' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            marginRight: 8,
            cursor: 'pointer'
          }}
        >
          按课程统计
        </button>
        <button
          onClick={() => setActiveTab('student')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'student' ? '#007bff' : 'transparent',
            color: activeTab === 'student' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            marginRight: 8,
            cursor: 'pointer'
          }}
        >
          按学生统计
        </button>
        <button
          onClick={() => setActiveTab('time')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'time' ? '#007bff' : 'transparent',
            color: activeTab === 'time' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer'
          }}
        >
          按时间统计
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <span>正在加载数据...</span>
        </div>
      )}

      {/* 课程统计 */}
      {activeTab === 'course' && !loading && (
        <div>
          <h4>📚 课程出勤统计</h4>
          {courseStats.length === 0 ? (
            <p>暂无课程数据</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'left' }}>课程名称</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>课次总数</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>学生总数</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>平均出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStats.map((course, index) => (
                    <tr key={course.courseId} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: 12, border: '1px solid #ddd' }}>{course.courseName}</td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{course.totalSessions}</td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{course.totalStudents}</td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>
                        <span style={{ 
                          color: course.averageAttendanceRate >= 80 ? '#28a745' : 
                                course.averageAttendanceRate >= 60 ? '#ffc107' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {course.averageAttendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 学生统计 */}
      {activeTab === 'student' && !loading && (
        <div>
          <h4>👨‍🎓 学生出勤统计</h4>
          {studentStats.length === 0 ? (
            <p>暂无学生数据</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'left' }}>学生地址</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>参与课次</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>出勤次数</th>
                    <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((student, index) => (
                    <tr key={student.studentAddress} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: 12, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '12px' }}>
                        {student.studentAddress.slice(0, 6)}...{student.studentAddress.slice(-4)}
                      </td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{student.totalSessions}</td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{student.attendedSessions}</td>
                      <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>
                        <span style={{ 
                          color: student.attendanceRate >= 80 ? '#28a745' : 
                                student.attendanceRate >= 60 ? '#ffc107' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {student.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 时间统计 */}
      {activeTab === 'time' && !loading && (
        <div>
          <h4>📅 时间维度统计</h4>
          {!timeStats ? (
            <p>暂无时间统计数据</p>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
                  <h5 style={{ margin: 0, color: '#6c757d' }}>总课次</h5>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{timeStats.totalSessions}</div>
                </div>
                <div style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
                  <h5 style={{ margin: 0, color: '#6c757d' }}>总出勤</h5>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{timeStats.totalAttendance}</div>
                </div>
                <div style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
                  <h5 style={{ margin: 0, color: '#6c757d' }}>平均出勤率</h5>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{timeStats.averageRate.toFixed(1)}%</div>
                </div>
              </div>
              
              {timeStats.trends.length > 0 && (
                <div>
                  <h5>📈 出勤趋势</h5>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'left' }}>日期</th>
                          <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>课次</th>
                          <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>出勤</th>
                          <th style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>出勤率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeStats.trends.map((trend, index) => (
                          <tr key={trend.date} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                            <td style={{ padding: 12, border: '1px solid #ddd' }}>{trend.date}</td>
                            <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{trend.sessions}</td>
                            <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>{trend.attendance}</td>
                            <td style={{ padding: 12, border: '1px solid #ddd', textAlign: 'center' }}>
                              <span style={{ 
                                color: trend.rate >= 80 ? '#28a745' : 
                                      trend.rate >= 60 ? '#ffc107' : '#dc3545',
                                fontWeight: 'bold'
                              }}>
                                {trend.rate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
