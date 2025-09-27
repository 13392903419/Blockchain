import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

const API = 'http://localhost:4000'

export function StudentCheckin() {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
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
      const response = await fetch(`${API}/api/attendance/checkin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: Number(sessionId),
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
        <input value={sessionId} onChange={e=>setSessionId(e.target.value)} style={{ width:120 }} />
        <label>元数据URI:</label>
        <input value={tokenUri} onChange={e=>setTokenUri(e.target.value)} style={{ width:280 }} />
        <button onClick={submit} disabled={loading}>{loading ? '提交中...' : '提交签到'}</button>
      </div>
      {result && <div style={{ marginTop:12 }}>{result}</div>}
    </div>
  )
}


