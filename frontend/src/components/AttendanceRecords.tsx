import { useState, useEffect } from 'react'
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

export function AttendanceRecords() {
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  // 筛选状态
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const loadRecords = async () => {
    if (!isAuthenticated) return

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
          allRecords = Array.isArray(data) ? data : []
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
              allRecords = allRecords.concat(data)
            }
          }
        }
      } else {
        // 没有选择任何筛选条件，获取所有记录
        const response = await fetch(`${API}/api/attendance/records`, {
          headers: getAuthHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          allRecords = Array.isArray(data) ? data : []
        }
      }

      setRecords(allRecords)
      setCurrentPage(1) // 重置页码
    } catch (error: any) {
      console.error('加载出勤记录失败:', error)
      alert(`加载出勤记录失败: ${error.message}`)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时获取课程列表
  useEffect(() => {
    loadCourses()
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
  }, [isAuthenticated, selectedCourseId, selectedSessionId])

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
        <h3>出勤记录查询</h3>
        <p>请先连接钱包并登录</p>
        <button onClick={login}>登录</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>出勤记录查询</h3>

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
                  {session.name}
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
            {loading ? '加载中...' : '查询'}
          </button>
          <span style={{ marginLeft: 12, fontSize: '12px', color: '#666' }}>
            {!selectedCourseId && !selectedSessionId && '显示全部出勤记录'}
            {selectedCourseId && !selectedSessionId && `显示 ${courses.find(c => c.id === selectedCourseId)?.name} 课程的全部课次记录`}
            {selectedSessionId && `显示 ${sessions.find(s => s.id === selectedSessionId)?.name} 的出勤记录`}
          </span>
        </div>
      </div>

      {/* 出勤记录列表 */}
      <div>
        <h4>出勤记录 ({records.length} 条)</h4>
        {records.length === 0 ? (
          <p style={{ color: '#666' }}>暂无出勤记录</p>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>课次</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>学生地址</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Token ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>状态</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>时间</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>交易哈希</th>
                </tr>
              </thead>
              <tbody>
                {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => {
                  // 显示友好的课次信息：从sessionId中提取序号
                  const sessionNumber = record.sessionId.includes('-') ? record.sessionId.split('-')[1] : record.sessionId
                  const displayText = `第${sessionNumber}次课`

                  return (
                    <tr key={record.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{displayText}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px' }}>
                        {`${record.studentAddress.slice(0, 6)}...${record.studentAddress.slice(-4)}`}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {record.tokenId || '-'}
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
                        {`${record.txHash.slice(0, 10)}...${record.txHash.slice(-8)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* 分页控件 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '8px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                上一页
              </button>
              <span>
                第 {currentPage} 页 / 共 {Math.ceil(records.length / pageSize) || 1} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(records.length / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(records.length / pageSize)}
                style={{ padding: '4px 12px', cursor: currentPage >= Math.ceil(records.length / pageSize) ? 'not-allowed' : 'pointer' }}
              >
                下一页
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ padding: '4px' }}
              >
                <option value={10}>10条/页</option>
                <option value={20}>20条/页</option>
                <option value={50}>50条/页</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
