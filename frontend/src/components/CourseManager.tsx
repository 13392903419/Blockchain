import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Course = { id: string; name: string; description?: string }
type Session = { id: string; courseId: string; startTime: number; endTime: number }

const API = 'http://localhost:4000'

export function CourseManager() {
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
      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
        <h3>课程管理</h3>
        <p>请先连接钱包并登录</p>
        <button onClick={login}>登录</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>课程管理</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input placeholder='课程名称' value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder='课程描述(可选)' value={description} onChange={e=>setDescription(e.target.value)} />
        <button onClick={createCourse}>创建课程</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8 }}>课程清单（便于对应课程ID与名称）：</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {courses.map(c => (
            <li key={c.id}>
              <span>课程ID: {c.id}</span>
              <span style={{ marginLeft: 8 }}>课程名: {c.name}</span>
              {c.description ? <span style={{ marginLeft: 8, color:'#666' }}>（{c.description}）</span> : null}
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 12 }}>
          <label>选择课程：</label>
          <select value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}>
            <option value=''>-- 请选择 --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}（ID: {c.id.slice(-6)}）</option>)}
          </select>
          {selectedCourse && (
            <span style={{ marginLeft: 8, color:'#333' }}>已选课程ID: {selectedCourse}</span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div>新增课次（时间窗口）</div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <input type='datetime-local' value={start} onChange={e=>setStart(e.target.value)} />
          <span>至</span>
          <input type='datetime-local' value={end} onChange={e=>setEnd(e.target.value)} />
          <button onClick={createSession}>创建课次</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div>课次列表：</div>
        <ul>
          {sessions.map(s => {
            const selected = courses.find(c => c.id === selectedCourse);
            const courseName = selected ? selected.name : '';
            return (
              <li key={s.id}>
                {courseName ? `${courseName} ` : ''}
                #{s.id} 时间：{new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleString()}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  )
}


