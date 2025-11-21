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
  const [tokenUri, setTokenUri] = useState<string>('ipfs://metadata')
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
          sessionId: selectedSessionId,
          tokenUri
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(`✅ 签到成功！交易哈希: ${data.hash}`)
      console.log('签到成功:', data)

      // 调用成功回调，刷新统计数据
      if (onCheckinSuccess) {
        onCheckinSuccess()
      }
    } catch (e: any) {
      console.error('签到失败:', e)
      setResult(`❌ 签到失败: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
        <h3>学生签到（基础版）</h3>
        <p>请先连接钱包并登录</p>
        <button onClick={login}>登录</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>学生签到（基础版）</h3>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <label>课次ID:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{ padding: '4px' }}
          >
            <option value="">选择课程</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            style={{ padding: '4px' }}
            disabled={!selectedCourseId}
          >
            <option value="">选择课次</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>
        <label>元数据URI:</label>
        <input value={tokenUri} onChange={e=>setTokenUri(e.target.value)} style={{ width:280 }} />
        <button onClick={submit} disabled={loading}>{loading ? '提交中...' : '提交签到'}</button>
      </div>
      {result && <div style={{ marginTop:12 }}>{result}</div>}
    </div>
  )
}


