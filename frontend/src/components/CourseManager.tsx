import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Course = { id: string; name: string; description?: string; createdAt: string }
type Session = { id: string; courseId: string; startTime: number; endTime: number; createdAt: string }

export function CourseManager() {
  const { isAuthenticated, login } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const [sessions, setSessions] = useState<Session[]>([])

  // 从本地存储加载课程
  const loadCourses = () => {
    if (!isAuthenticated) return
    const savedCourses = JSON.parse(localStorage.getItem('courses') || '[]')
    setCourses(savedCourses)
  }

  // 从本地存储加载课次
  const loadSessions = (courseId: string) => {
    if (!isAuthenticated) return
    const savedSessions = JSON.parse(localStorage.getItem('sessions') || '[]')
    const courseSessions = savedSessions.filter((s: Session) => s.courseId === courseId)
    setSessions(courseSessions)
  }

  useEffect(() => { loadCourses() }, [isAuthenticated])
  useEffect(() => { if (selectedCourse) loadSessions(selectedCourse) }, [selectedCourse, isAuthenticated])

  // 创建课程 - 保存到本地存储
  const createCourse = () => {
    if (!isAuthenticated) return alert('请先登录')
    if (!name.trim()) return alert('请输入课程名称')
    
    const newCourse: Course = {
      id: `course_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString()
    }
    
    const existingCourses = JSON.parse(localStorage.getItem('courses') || '[]')
    existingCourses.push(newCourse)
    localStorage.setItem('courses', JSON.stringify(existingCourses))
    
    setName('')
    setDescription('')
    loadCourses()
    setSelectedCourse(newCourse.id)
    
    console.log('课程已创建:', newCourse)
  }

  // 创建课次 - 保存到本地存储
  const createSession = () => {
    if (!isAuthenticated) return alert('请先登录')
    if (!selectedCourse) return alert('请选择课程')
    if (!start || !end) return alert('请输入开始和结束时间')
    
    const startTime = Date.parse(start)
    const endTime = Date.parse(end)
    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      return alert('时间不合法')
    }
    
    const newSession: Session = {
      id: `session_${Date.now()}`,
      courseId: selectedCourse,
      startTime,
      endTime,
      createdAt: new Date().toISOString()
    }
    
    const existingSessions = JSON.parse(localStorage.getItem('sessions') || '[]')
    existingSessions.push(newSession)
    localStorage.setItem('sessions', JSON.stringify(existingSessions))
    
    setStart('')
    setEnd('')
    loadSessions(selectedCourse)
    
    console.log('课次已创建:', newSession)
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
        <label>选择课程：</label>
        <select value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}>
          <option value=''>-- 请选择 --</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
          {sessions.map(s => (
            <li key={s.id}>#{s.id.slice(-6)} 时间：{new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}


