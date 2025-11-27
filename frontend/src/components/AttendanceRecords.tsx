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
      <div className="attendance-records-container">
        <div className="auth-required-card">
          <div className="auth-icon">🔒</div>
          <h3>需要登录</h3>
          <p>请先连接钱包并登录以查看出勤记录</p>
          <button className="auth-button" onClick={login}>
            <span className="button-icon">🔑</span>
            连接钱包登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="attendance-records-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-icon">📋</div>
        <div className="header-content">
          <h2>出勤记录查询</h2>
          <p>查看和管理学生的出勤情况，追踪NFT铸造记录</p>
        </div>
      </div>

      {/* 筛选器卡片 */}
      <div className="filters-card">
        <div className="card-header">
          <div className="card-icon">🔍</div>
          <h3>筛选条件</h3>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">选择课程</label>
            <select
              className="modern-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
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
            <div className="filter-group">
              <label className="filter-label">选择课次</label>
              <select
                className="modern-select"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
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

          <div className="filter-actions">
            <button
              className="primary-button"
              onClick={loadRecords}
              disabled={loading}
            >
              <span className="button-icon">
                {loading ? '⏳' : '🔍'}
              </span>
              {loading ? '查询中...' : '查询记录'}
            </button>
          </div>
        </div>

        {/* 当前筛选状态 */}
        <div className="filter-status">
          <span className="status-icon">ℹ️</span>
          <span className="status-text">
            {!selectedCourseId && !selectedSessionId && '显示全部出勤记录'}
            {selectedCourseId && !selectedSessionId && `显示 ${courses.find(c => c.id === selectedCourseId)?.name} 课程的全部课次记录`}
            {selectedSessionId && `显示 ${sessions.find(s => s.id === selectedSessionId)?.name} 的出勤记录`}
          </span>
        </div>
      </div>

      {/* 出勤记录统计 */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{records.length}</div>
            <div className="stat-label">总记录数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">
              {records.filter(r => r.status === 'present').length}
            </div>
            <div className="stat-label">出勤次数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-number">
              {records.length > 0
                ? ((records.filter(r => r.status === 'present').length / records.length) * 100).toFixed(1)
                : '0.0'
              }%
            </div>
            <div className="stat-label">出勤率</div>
          </div>
        </div>
      </div>

      {/* 出勤记录表格 */}
      <div className="records-table-card">
        <div className="card-header">
          <div className="card-icon">📋</div>
          <h3>出勤记录详情</h3>
          <div className="records-count">
            <span className="count-badge">{records.length}</span>
            <span className="count-label">条记录</span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h4>暂无出勤记录</h4>
            <p>请调整筛选条件或等待学生出勤记录</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>课次</th>
                    <th>学生地址</th>
                    <th>Token ID</th>
                    <th>出勤状态</th>
                    <th>记录时间</th>
                    <th>交易哈希</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => {
                    // 显示友好的课次信息：从sessionId中提取序号
                    const sessionNumber = record.sessionId.includes('-') ? record.sessionId.split('-')[1] : record.sessionId
                    const displayText = `第${sessionNumber}次课`

                    return (
                      <tr key={record.id} className={record.status === 'present' ? 'present-row' : 'absent-row'}>
                        <td className="session-cell">
                          <div className="session-badge">{displayText}</div>
                        </td>
                        <td className="address-cell">
                          <code className="address-code">
                            {`${record.studentAddress.slice(0, 6)}...${record.studentAddress.slice(-4)}`}
                          </code>
                          <button
                            className="copy-button"
                            onClick={() => navigator.clipboard.writeText(record.studentAddress)}
                            title="复制完整地址"
                          >
                            📋
                          </button>
                        </td>
                        <td className="token-cell">
                          {record.tokenId ? (
                            <code className="token-code">#{record.tokenId}</code>
                          ) : (
                            <span className="no-token">-</span>
                          )}
                        </td>
                        <td className="status-cell">
                          <div className={`status-badge ${record.status === 'present' ? 'present' : 'absent'}`}>
                            <span className="status-icon">
                              {record.status === 'present' ? '✅' : '❌'}
                            </span>
                            <span className="status-text">
                              {record.status === 'present' ? '已出勤' : '缺勤'}
                            </span>
                          </div>
                        </td>
                        <td className="time-cell">
                          <div className="timestamp">
                            {new Date(record.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="hash-cell">
                          <code className="hash-code">
                            {`${record.txHash.slice(0, 10)}...${record.txHash.slice(-8)}`}
                          </code>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                            title="在Etherscan上查看"
                          >
                            🔗
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            <div className="pagination-container">
              <div className="pagination-info">
                <span className="page-info">
                  第 {currentPage} 页 / 共 {Math.ceil(records.length / pageSize) || 1} 页
                </span>
                <span className="total-info">
                  共 {records.length} 条记录
                </span>
              </div>

              <div className="pagination-controls">
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <span className="button-icon">⬅️</span>
                  上一页
                </button>

                <div className="page-size-selector">
                  <label>每页显示:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="page-size-select"
                  >
                    <option value={10}>10条</option>
                    <option value={20}>20条</option>
                    <option value={50}>50条</option>
                    <option value={100}>100条</option>
                  </select>
                </div>

                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(records.length / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(records.length / pageSize)}
                >
                  下一页
                  <span className="button-icon">➡️</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
