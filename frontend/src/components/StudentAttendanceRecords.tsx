import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

const API = 'http://localhost:4000'

interface AttendanceRecord {
  id: string
  sessionId: string
  studentAddress: string
  tokenId?: number
  txHash: string
  status: string
  timestamp: number
}

interface Course {
  id: string
  name: string
  description?: string
}

interface Session {
  id: string
  courseId: string
  sessionNumber: number
  name: string
  startTime: number
  endTime: number
}

export function StudentAttendanceRecords() {
  const { address } = useAccount()
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  // 筛选状态
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // 用于显示的课程和课次映射
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [allSessions, setAllSessions] = useState<Session[]>([])

  // 获取所有课程
  const loadCourses = async () => {
    if (!isAuthenticated) return
    try {
      const response = await fetch(`${API}/api/courses`, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('获取课程列表失败:', error)
    }
  }

  // 获取指定课程的课次
  const loadSessions = async (courseId: string) => {
    if (!isAuthenticated || !courseId) return
    try {
      const response = await fetch(`${API}/api/courses/${courseId}/sessions`, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('获取课次列表失败:', error)
    }
  }

  // 加载所有课程和课次信息（用于显示课程名）
  const loadAllCoursesAndSessions = async () => {
    if (!isAuthenticated) return
    try {
      console.log('🔍 开始加载所有课程和课次信息...')
      // 获取所有课程
      const coursesResponse = await fetch(`${API}/api/courses`, {
        headers: getAuthHeaders()
      })
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        console.log('✅ 获取到课程数据:', coursesData.length, '个课程')
        setAllCourses(coursesData)

        // 为每个课程获取课次信息
        const allSessionsData: Session[] = []
        for (const course of coursesData) {
          try {
            const sessionsResponse = await fetch(`${API}/api/courses/${course.id}/sessions`, {
              headers: getAuthHeaders()
            })
            if (sessionsResponse.ok) {
              const sessionsData = await sessionsResponse.json()
              console.log(`✅ 课程 "${course.name}" 有 ${sessionsData.length} 个课次`)
              allSessionsData.push(...sessionsData)
            }
          } catch (error) {
            console.error(`❌ 获取课程 ${course.name} 的课次失败:`, error)
          }
        }
        console.log('✅ 总共加载了', allSessionsData.length, '个课次')
        console.log('📋 加载的课程列表:', coursesData.map((c:any) => ({ id: c.id, name: c.name })))
        console.log('📋 加载的课次列表:', allSessionsData.map(s => ({
          id: s.id,
          courseId: s.courseId,
          name: s.name
        })))
        setAllSessions(allSessionsData)
      } else {
        console.error('❌ 获取课程列表失败:', coursesResponse.status)
      }
    } catch (error) {
      console.error('❌ 加载所有课程和课次信息失败:', error)
    }
  }

  const loadRecords = async () => {
    if (!isAuthenticated || !address) return

    setLoading(true)
    try {
      let allRecords: AttendanceRecord[] = []

      if (selectedSessionId) {
        // 选择了具体课次，只查询该课次的记录
        const response = await fetch(`${API}/api/attendance/records?sessionId=${selectedSessionId}`, {
          headers: getAuthHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          const sessionRecords = Array.isArray(data) ? data : []
          // 只保留当前学生的记录
          allRecords = sessionRecords.filter(record =>
            record.studentAddress.toLowerCase() === address.toLowerCase()
          )
        }
      } else if (selectedCourseId) {
        // 只选择了课程，获取该课程所有课次的记录
        const courseSessions = sessions.filter(s => s.courseId === selectedCourseId)
        for (const session of courseSessions) {
          const response = await fetch(`${API}/api/attendance/records?sessionId=${session.id}`, {
            headers: getAuthHeaders()
          })
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              // 只保留当前学生的记录
              const studentRecords = data.filter(record =>
                record.studentAddress.toLowerCase() === address.toLowerCase()
              )
              allRecords = allRecords.concat(studentRecords)
            }
          }
        }
      } else {
        // 没有选择任何筛选条件，获取所有记录，但只显示当前学生的
        const response = await fetch(`${API}/api/attendance/records`, {
          headers: getAuthHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          const allAttendanceRecords = Array.isArray(data) ? data : []
          // 只保留当前学生的记录
          allRecords = allAttendanceRecords.filter(record =>
            record.studentAddress.toLowerCase() === address.toLowerCase()
          )
        }
      }

      setRecords(allRecords)
    } catch (error: any) {
      console.error('加载出勤记录失败:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时获取课程列表和所有课程课次信息
  useEffect(() => {
    loadCourses()
    loadAllCoursesAndSessions()
  }, [isAuthenticated])

  // 当选择的课程改变时，获取对应的课次列表
  useEffect(() => {
    if (selectedCourseId) {
      loadSessions(selectedCourseId)
      setSelectedSessionId('') // 重置选择的课次
    } else {
      setSessions([])
      setSelectedSessionId('')
    }
  }, [selectedCourseId])

  // 当筛选条件改变时，重新加载记录
  useEffect(() => {
    loadRecords()
  }, [isAuthenticated, address, selectedCourseId, selectedSessionId])

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
        <h3>我的出勤记录</h3>
        <p>请先连接钱包并登录</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>我的出勤记录</h3>

      {/* 筛选器 */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ marginRight: 8 }}>选择课程（可选）: </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{ padding: '4px 8px', minWidth: '200px' }}
          >
            <option value="">全部课程</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCourseId && (
          <div>
            <label style={{ marginRight: 8 }}>选择课次（可选）: </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{ padding: '4px 8px', minWidth: '200px' }}
            >
              <option value="">该课程全部课次</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} (#{session.sessionNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <button
            onClick={loadRecords}
            disabled={loading}
            style={{ padding: '4px 12px' }}
          >
            {loading ? '加载中...' : '刷新'}
          </button>
          <span style={{ marginLeft: 12, fontSize: '12px', color: '#666' }}>
            {!selectedCourseId && !selectedSessionId && '显示您的全部出勤记录'}
            {selectedCourseId && !selectedSessionId && `显示 ${courses.find(c => c.id === selectedCourseId)?.name} 课程的出勤记录`}
            {selectedSessionId && `显示 ${sessions.find(s => s.id === selectedSessionId)?.name} 的出勤记录`}
          </span>
        </div>
      </div>

      {/* 出勤记录列表 */}
      <div>
        <h4>出勤记录 ({records.length} 条)</h4>
        {records.length === 0 ? (
          <p style={{ color: '#666' }}>
            {loading ? '加载中...' : '暂无出勤记录'}
          </p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>课程名</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>课次</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Token ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>状态</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>出勤时间</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>交易哈希</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  // 找到对应的session信息 - 尝试多种匹配方式
                  const session = allSessions.find(s => {
                    // 尝试精确匹配
                    if (s.id === record.sessionId) return true
                    // 尝试字符串转换匹配
                    if (String(s.id) === String(record.sessionId)) return true
                    return false
                  })

                  // 找到对应的课程信息
                  const course = session ? allCourses.find(c => {
                    // 尝试精确匹配
                    if (c.id === session.courseId) return true
                    // 尝试字符串转换匹配
                    if (String(c.id) === String(session.courseId)) return true
                    return false
                  }) : null

                  // 显示友好的课次信息：从sessionId中提取序号
                  const sessionNumber = String(record.sessionId).includes('-') ? String(record.sessionId).split('-')[1] : String(record.sessionId)
                  const sessionDisplayText = session ? session.name : `第${sessionNumber}次课`
                  const courseDisplayText = course ? course.name : `课程ID:${session?.courseId || '未知'}`

                  // 调试信息 - 为每个记录都显示，方便调试
                  console.log(`🔍 记录 ${record.id}:`, {
                    recordSessionId: record.sessionId,
                    recordSessionIdType: typeof record.sessionId,
                    foundSession: session ? {
                      id: session.id,
                      idType: typeof session.id,
                      name: session.name,
                      courseId: session.courseId,
                      courseIdType: typeof session.courseId
                    } : null,
                    foundCourse: course ? {
                      id: course.id,
                      idType: typeof course.id,
                      name: course.name
                    } : null,
                    courseDisplayText,
                    allSessionsCount: allSessions.length,
                    allCoursesCount: allCourses.length
                  })

                  return (
                    <tr key={record.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{courseDisplayText}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sessionDisplayText}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {record.tokenId ? `#${record.tokenId}` : '-'}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        <span style={{
                          color: record.status === 'present' ? '#28a745' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {record.status === 'present' ? '✅ 已出勤' : '❌ 缺勤'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px' }}>
                        <a
                          href={`https://etherscan.io/tx/${record.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#007bff', textDecoration: 'none' }}
                        >
                          {`${record.txHash.slice(0, 10)}...${record.txHash.slice(-8)}`}
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}