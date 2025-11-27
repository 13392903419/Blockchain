import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

const API = 'http://localhost:4000'

interface Course {
  id: string
  name: string
  description: string
}

interface Session {
  id: string
  courseId: string
  sessionNumber: number // 课程内的课次序号
  name: string
  startTime: number
  endTime: number
}

interface StudentCheckinProps {
  onCheckinSuccess?: () => void
}

export function StudentCheckin({ onCheckinSuccess }: StudentCheckinProps) {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  // 获取所有课程
  const loadCourses = async () => {
    if (!isAuthenticated) return
    try {
      const res = await fetch(`${API}/api/courses`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
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
      const res = await fetch(`${API}/api/courses/${courseId}/sessions`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('获取课次列表失败:', error)
    }
  }

  // 当课程选择改变时，获取对应的课次
  useEffect(() => {
    if (selectedCourseId) {
      loadSessions(selectedCourseId)
      setSelectedSessionId('') // 重置选择的课次
    } else {
      setSessions([])
    }
  }, [selectedCourseId])

  // 组件加载时获取课程列表
  useEffect(() => {
    loadCourses()
  }, [isAuthenticated])

  const submit = async () => {
    if (!isConnected || !address) return alert('请先连接钱包')
    if (!isAuthenticated) return alert('请先登录')
    if (!selectedSessionId) return alert('请选择要签到的课次')

    setLoading(true)
    setResult('')

    try {
      const response = await fetch(`${API}/api/attendance/checkin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: selectedSessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.checkedIn) {
        setResult(`✅ 出勤记录确认成功！${data.message}`)
        console.log('出勤记录查询成功:', data)
      } else {
        setResult(`❌ 未找到出勤记录: ${data.error}`)
        console.log('未找到出勤记录:', data)
      }

      // 调用成功回调，刷新统计数据
      if (onCheckinSuccess) {
        onCheckinSuccess()
      }
    } catch (e: any) {
      console.error('签到失败:', e)
      setResult(`❌ 查询失败: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="checkin-container">
        <div className="checkin-header">
          <div className="header-icon">🔍</div>
          <div className="header-content">
            <h2>出勤查询</h2>
            <p>请先连接钱包并登录以查询您的出勤记录</p>
          </div>
        </div>
        <div className="auth-prompt">
          <div className="auth-icon">🔐</div>
          <div className="auth-content">
            <h3>需要身份验证</h3>
            <p>请先完成钱包连接和身份验证</p>
            <button onClick={login} className="auth-button">
              <span className="button-icon">🚀</span>
              <span className="button-text">开始验证</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="checkin-container">
      <div className="checkin-header">
        <div className="header-icon">📱</div>
        <div className="header-content">
          <h2>出勤查询</h2>
          <p>选择课程和课次，查询您的出勤记录</p>
        </div>
      </div>

      <div className="checkin-form">
        <div className="selection-section">
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📚</span>
              选择课程
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="form-select"
            >
              <option value="">请选择课程</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📅</span>
              选择课次
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="form-select"
              disabled={!selectedCourseId}
            >
              <option value="">
                {selectedCourseId ? '请选择课次' : '请先选择课程'}
              </option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} (第{session.sessionNumber}次课)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={submit}
            disabled={loading || !selectedSessionId}
            className={`checkin-button ${loading ? 'loading' : ''}`}
          >
            <span className="button-icon">
              {loading ? '⏳' : '🔍'}
            </span>
            <span className="button-text">
              {loading ? '查询中...' : '查询出勤记录'}
            </span>
          </button>
        </div>

        {result && (
          <div className={`result-message ${result.startsWith('✅') ? 'success' : 'error'}`}>
            <div className="result-icon">
              {result.startsWith('✅') ? '✅' : '❌'}
            </div>
            <div className="result-content">
              <div className="result-text">{result}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


