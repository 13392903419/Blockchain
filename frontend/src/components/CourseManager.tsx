import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Course = { id: string; name: string; description?: string }
type Session = { id: string; courseId: string; sessionNumber: number; name: string; startTime: number; endTime: number }

const API = 'http://localhost:4000'

interface CourseManagerProps {
  onCourseUpdate?: () => void
}

export function CourseManager({ onCourseUpdate }: CourseManagerProps) {
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const [sessions, setSessions] = useState<Session[]>([])

  const loadCourses = async () => {
    if (!isAuthenticated) return
    try {
      const res = await fetch(`${API}/api/courses`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setCourses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载课程失败:', error)
      setCourses([])
    }
  }

  const loadSessions = async (courseId: string) => {
    if (!isAuthenticated) return
    try {
      const res = await fetch(`${API}/api/courses/${courseId}/sessions`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载课次失败:', error)
      setSessions([])
    }
  }

  useEffect(() => { loadCourses() }, [isAuthenticated])
  useEffect(() => { if (selectedCourse) loadSessions(selectedCourse) }, [selectedCourse, isAuthenticated])

  const createCourse = async () => {
    if (!isAuthenticated) return alert('请先登录')
    if (!name.trim()) return alert('请输入课程名称')

    try {
      const res = await fetch(`${API}/api/courses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      const c = await res.json()
      setName('')
      setDescription('')
      await loadCourses()
      setSelectedCourse(c.id)

      // 调用回调函数更新统计数据
      if (onCourseUpdate) {
        onCourseUpdate()
      }
    } catch (error: any) {
      console.error('创建课程失败:', error)
      alert(`创建课程失败: ${error.message}`)
    }
  }

  const createSession = async () => {
    if (!isAuthenticated) return alert('请先登录')
    if (!selectedCourse) return alert('请选择课程')
    if (!start || !end) return alert('请输入开始和结束时间')

    const startTime = Date.parse(start)
    const endTime = Date.parse(end)
    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      return alert('时间不合法')
    }

    try {
      const res = await fetch(`${API}/api/courses/${selectedCourse}/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ startTime, endTime })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      await res.json()
      setStart('')
      setEnd('')
      await loadSessions(selectedCourse)
    } catch (error: any) {
      console.error('创建课次失败:', error)
      alert(`创建课次失败: ${error.message}`)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="course-manager-container">
        <div className="auth-required-card">
          <div className="auth-icon">🔒</div>
          <h3>需要登录</h3>
          <p>请先连接钱包并登录以使用课程管理功能</p>
          <button className="auth-button" onClick={login}>
            <span className="button-icon">🔑</span>
            连接钱包登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="course-manager-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-icon">📚</div>
        <div className="header-content">
          <h2>课程管理</h2>
          <p>创建和管理您的课程，设置课次时间窗口</p>
        </div>
      </div>

      {/* 创建课程卡片 */}
      <div className="create-course-card">
        <div className="card-header">
          <div className="card-icon">✨</div>
          <h3>创建新课程</h3>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">课程名称</label>
            <input
              type="text"
              className="modern-input"
              placeholder="请输入课程名称"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">课程描述 <span className="optional">(可选)</span></label>
            <input
              type="text"
              className="modern-input"
              placeholder="简要描述课程内容"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className="primary-button"
              onClick={createCourse}
              disabled={!name.trim()}
            >
              <span className="button-icon">➕</span>
              创建课程
            </button>
          </div>
        </div>
      </div>

      {/* 课程列表 */}
      <div className="courses-list-card">
        <div className="card-header">
          <div className="card-icon">📋</div>
          <h3>课程清单</h3>
          <div className="courses-count">
            <span className="count-badge">{courses.length}</span>
            <span className="count-label">个课程</span>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h4>暂无课程</h4>
            <p>开始创建您的第一个课程吧！</p>
          </div>
        ) : (
          <div className="courses-table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>课程ID</th>
                  <th>课程名称</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => (
                  <tr key={course.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td className="mono-text">
                      <code>{course.id.slice(-8)}</code>
                    </td>
                    <td className="course-name">{course.name}</td>
                    <td className="course-description">
                      {course.description || <span className="no-description">无描述</span>}
                    </td>
                    <td>
                      <button
                        className={`action-button ${selectedCourse === course.id ? 'active' : ''}`}
                        onClick={() => setSelectedCourse(selectedCourse === course.id ? '' : course.id)}
                      >
                        {selectedCourse === course.id ? '已选择' : '选择'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 课次管理 */}
      {courses.length > 0 && (
        <div className="sessions-management-card">
          <div className="card-header">
            <div className="card-icon">🕒</div>
            <h3>课次管理</h3>
          </div>

          {/* 课程选择器 */}
          <div className="course-selector">
            <label className="form-label">选择课程</label>
            <select
              className="modern-select"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">-- 请选择课程 --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (ID: {c.id.slice(-6)})
                </option>
              ))}
            </select>
            {selectedCourse && (
              <div className="selected-info">
                <span className="info-icon">✅</span>
                已选择: <strong>{courses.find(c => c.id === selectedCourse)?.name}</strong>
              </div>
            )}
          </div>

          {/* 创建课次表单 */}
          {selectedCourse && (
            <div className="create-session-section">
              <h4>新增课次</h4>
              <div className="session-form-grid">
                <div className="form-group">
                  <label className="form-label">开始时间</label>
                  <input
                    type="datetime-local"
                    className="modern-input"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">结束时间</label>
                  <input
                    type="datetime-local"
                    className="modern-input"
                    value={end}
                    onChange={e => setEnd(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="primary-button"
                    onClick={createSession}
                    disabled={!start || !end}
                  >
                    <span className="button-icon">➕</span>
                    创建课次
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 课次列表 */}
          {selectedCourse && (
            <div className="sessions-list">
              <div className="section-header">
                <h4>课次列表</h4>
                <div className="sessions-count">
                  <span className="count-badge">{sessions.length}</span>
                  <span className="count-label">个课次</span>
                </div>
              </div>

              {sessions.length === 0 ? (
                <div className="empty-state small">
                  <div className="empty-icon">🕒</div>
                  <p>该课程暂无课次</p>
                </div>
              ) : (
                <div className="sessions-grid">
                  {sessions.map(session => (
                    <div key={session.id} className="session-card">
                      <div className="session-header">
                        <div className="session-number">#{session.sessionNumber}</div>
                        <div className="session-status">活跃</div>
                      </div>
                      <div className="session-times">
                        <div className="time-item">
                          <span className="time-label">开始:</span>
                          <span className="time-value">
                            {new Date(session.startTime).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="time-item">
                          <span className="time-label">结束:</span>
                          <span className="time-value">
                            {new Date(session.endTime).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


