import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

export function StudentCheckin() {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, login } = useAuth()
  const [sessionId, setSessionId] = useState<string>('1')
  const [tokenUri, setTokenUri] = useState<string>('ipfs://metadata')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const submit = async () => {
    if (!isConnected || !address) return alert('请先连接钱包')
    if (!isAuthenticated) return alert('请先登录')
    
    setLoading(true)
    setResult('')
    
    try {
      // 简化版签到 - 不需要后端API
      // 这里可以添加前端逻辑，比如记录到localStorage
      const attendanceRecord = {
        sessionId: Number(sessionId),
        studentAddress: address,
        tokenUri,
        timestamp: new Date().toISOString(),
        status: 'present'
      }
      
      // 保存到本地存储
      const existingRecords = JSON.parse(localStorage.getItem('attendance_records') || '[]')
      existingRecords.push(attendanceRecord)
      localStorage.setItem('attendance_records', JSON.stringify(existingRecords))
      
      setResult(`✅ 签到成功！课次ID: ${sessionId}`)
      console.log('签到记录已保存到本地存储:', attendanceRecord)
    } catch (e: any) {
      setResult(`❌ 错误: ${e.message}`)
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
        <input value={sessionId} onChange={e=>setSessionId(e.target.value)} style={{ width:120 }} />
        <label>元数据URI:</label>
        <input value={tokenUri} onChange={e=>setTokenUri(e.target.value)} style={{ width:280 }} />
        <button onClick={submit} disabled={loading}>{loading ? '提交中...' : '提交签到'}</button>
      </div>
      {result && <div style={{ marginTop:12 }}>{result}</div>}
    </div>
  )
}


