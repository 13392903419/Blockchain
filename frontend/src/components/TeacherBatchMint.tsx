import { useState, useEffect } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

// 合约ABI
const contractABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
      { "internalType": "address", "name": "student", "type": "address" },
      { "internalType": "string", "name": "tokenUri", "type": "string" }
    ],
    "name": "mintAttendance",
    "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

const API = 'http://localhost:4000'

interface Course {
  id: string
  name: string
  description?: string
}

interface Session {
  id: string
  courseId: string
  sessionNumber: number
  globalSessionId?: number
  name: string
  startTime: number
  endTime: number
}

export function TeacherBatchMint() {
  const { address } = useAccount()
  const { isAuthenticated, getAuthHeaders } = useAuth()

  // 状态管理
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [studentAddress, setStudentAddress] = useState<string>('')
  const [tokenUri, setTokenUri] = useState<string>('ipfs://metadata')
  const [isMinting, setIsMinting] = useState(false)
  const [mintResult, setMintResult] = useState<string>('')

  // 合约地址
  const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`

  const { writeContractAsync } = useWriteContract()

  // 加载课程列表
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

  // 加载指定课程的课次
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

  // 当选择课程时，加载对应的课次
  useEffect(() => {
    if (selectedCourseId) {
      loadSessions(selectedCourseId)
      setSelectedSessionId('') // 重置课次选择
    } else {
      setSessions([])
    }
  }, [selectedCourseId])

  // 初始化加载课程
  useEffect(() => {
    loadCourses()
  }, [isAuthenticated])

  // 铸造NFT
  const handleMint = async () => {
    if (!selectedSessionId) {
      alert('请选择课次')
      return
    }

    if (!studentAddress.trim()) {
      alert('请输入学生地址')
      return
    }

    const addr = studentAddress.trim()
    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('学生地址格式不正确')
      return
    }

    // 获取session信息
    const selectedSession = sessions.find(s => s.id === selectedSessionId)
    if (!selectedSession) {
      alert('选择的课次不存在')
      return
    }

    console.log('开始铸造NFT:', {
      contractAddress,
      sessionId: selectedSessionId,
      sessionNumber: selectedSession.sessionNumber,
      globalSessionId: selectedSession.globalSessionId,
      studentAddress: addr,
      tokenUri
    })

    setIsMinting(true)
    setMintResult('正在铸造NFT...')

    try {
      // 查找选中session的globalSessionId作为合约的sessionId
      const selectedSession = sessions.find(s => s.id === selectedSessionId)
      const contractSessionId = selectedSession?.globalSessionId || selectedSessionId

      console.log('合约调用参数:', {
        sessionId: contractSessionId,
        student: addr,
        tokenUri
      })

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'mintAttendance',
        args: [BigInt(contractSessionId), addr as `0x${string}`, tokenUri],
      })

      console.log('铸造成功:', hash)

      // 铸造成功后，通过API记录出勤到数据库
      try {
        const attendanceResponse = await fetch(`${API}/api/attendance/record`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: selectedSessionId, // 使用完整的sessionId
            studentAddress: addr,
            tokenId: undefined, // 暂时不知道tokenId，需要从交易回执中获取
            txHash: hash,
            tokenUri: tokenUri
          })
        })

        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json()
          console.log('出勤记录成功:', attendanceData)
          setMintResult(`✅ 铸造成功！交易哈希: ${hash}\n✅ 出勤记录已保存到数据库`)
        } else {
          const errorData = await attendanceResponse.json()
          console.error('出勤记录失败:', errorData)
          setMintResult(`✅ 铸造成功！交易哈希: ${hash}\n⚠️ 出勤记录保存失败: ${errorData.error}`)
        }
      } catch (apiError: any) {
        console.error('API调用失败:', apiError)
        setMintResult(`✅ 铸造成功！交易哈希: ${hash}\n⚠️ 出勤记录API调用失败: ${apiError.message}`)
      }
    } catch (err: any) {
      console.error('铸造失败:', err)

      let errorMsg = '未知错误'
      if (err?.message) {
        if (err.message.includes('reverted')) {
          errorMsg = '合约执行失败，可能是权限或参数问题'
        } else if (err.message.includes('User rejected')) {
          errorMsg = '用户取消了交易'
        } else {
          errorMsg = err.message
        }
      }

      setMintResult(`❌ 铸造失败: ${errorMsg}`)
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 20 }}>
      <h3>教师端 - 铸造出勤NFT</h3>

      {/* 课程选择 */}
      <div style={{ marginBottom: 16 }}>
        <label>选择课程: </label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          style={{ width: 200, marginLeft: 8, padding: '4px 8px' }}
        >
          <option value="">请选择课程</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* 课次选择 */}
      <div style={{ marginBottom: 16 }}>
        <label>选择课次: </label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          style={{ width: 200, marginLeft: 8, padding: '4px 8px' }}
          disabled={!selectedCourseId}
        >
          <option value="">请选择课次</option>
          {sessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.name} (#{session.sessionNumber})
            </option>
          ))}
        </select>
      </div>

      {/* 学生地址输入 */}
      <div style={{ marginBottom: 16 }}>
        <label>学生地址: </label>
        <input
          value={studentAddress}
          onChange={(e) => setStudentAddress(e.target.value)}
          style={{ width: 400, marginLeft: 8, padding: '4px 8px' }}
          placeholder="0x..."
        />
      </div>

      {/* Token URI输入 */}
      <div style={{ marginBottom: 16 }}>
        <label>NFT元数据URI: </label>
        <input
          value={tokenUri}
          onChange={(e) => setTokenUri(e.target.value)}
          style={{ width: 300, marginLeft: 8, padding: '4px 8px' }}
          placeholder="ipfs://metadata"
        />
      </div>

      {/* 铸造按钮 */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleMint}
          disabled={isMinting}
          style={{
            padding: '10px 20px',
            backgroundColor: isMinting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isMinting ? 'not-allowed' : 'pointer'
          }}
        >
          {isMinting ? '铸造中...' : '铸造NFT'}
        </button>
      </div>

      {/* 结果显示 */}
      {mintResult && (
        <div style={{
          marginTop: 16,
          padding: 10,
          borderRadius: 4,
          backgroundColor: mintResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: mintResult.startsWith('✅') ? '#155724' : '#721c24',
          whiteSpace: 'pre-wrap'
        }}>
          {mintResult}
        </div>
      )}

      {/* 调试信息 */}
      <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        <div>合约地址: {contractAddress}</div>
        <div>当前地址: {address}</div>
        <div>选择课程: {selectedCourseId || '未选择'}</div>
        <div>选择课次: {selectedSessionId || '未选择'}</div>
      </div>
    </div>
  )
}
