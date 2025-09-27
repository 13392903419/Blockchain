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

export function AttendanceRecords() {
  const { isAuthenticated, getAuthHeaders, login } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')

  const loadRecords = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const url = sessionId
        ? `${API}/api/attendance/records?sessionId=${sessionId}`
        : `${API}/api/attendance/records`

      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载出勤记录失败:', error)
      alert(`加载出勤记录失败: ${error.message}`)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [isAuthenticated, sessionId])

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
      <div style={{ marginBottom: 16 }}>
        <label>课次ID筛选（留空显示所有）: </label>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="输入课次ID或留空"
          style={{ width: 200, marginLeft: 8, padding: '4px 8px' }}
        />
        <button
          onClick={loadRecords}
          disabled={loading}
          style={{ marginLeft: 12, padding: '4px 12px' }}
        >
          {loading ? '加载中...' : '查询'}
        </button>
      </div>

      {/* 出勤记录列表 */}
      <div>
        <h4>出勤记录 ({records.length} 条)</h4>
        {records.length === 0 ? (
          <p style={{ color: '#666' }}>暂无出勤记录</p>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>课次ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>学生地址</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Token ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>状态</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>时间</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>交易哈希</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.sessionId}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
