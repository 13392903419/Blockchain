import { useState, useEffect } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { useAuth } from '../hooks/useAuth'
import { ethers } from 'ethers'

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
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
      { "internalType": "address[]", "name": "students", "type": "address[]" },
      { "internalType": "string", "name": "baseTokenUri", "type": "string" }
    ],
    "name": "batchMintAttendance",
    "outputs": [],
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
  const [mintMode, setMintMode] = useState<'single' | 'batch'>('single')
  const [studentAddress, setStudentAddress] = useState<string>('')
  const [studentAddresses, setStudentAddresses] = useState<string>('')
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

  // 解析学生地址数组
  const parseStudentAddresses = (input: string): string[] => {
    return input
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.match(/^0x[a-fA-F0-9]{40}$/))
  }

  // 批量铸造NFT
  const handleBatchMint = async () => {
    if (!selectedSessionId) {
      alert('请选择课次')
      return
    }

    const addresses = parseStudentAddresses(studentAddresses)
    if (addresses.length === 0) {
      alert('请输入至少一个有效的学生地址（每行一个）')
      return
    }

    const selectedSession = sessions.find(s => s.id === selectedSessionId)
    if (!selectedSession) {
      alert('选择的课次不存在')
      return
    }

    if (!selectedSession.globalSessionId) {
      alert('课次信息不完整，缺少globalSessionId')
      return
    }

    setIsMinting(true)
    setMintResult(`正在为 ${addresses.length} 个学生批量铸造NFT...`)

    try {
      const contractSessionId = selectedSession.globalSessionId
      const studentsArray = addresses as `0x${string}`[]

      console.log('批量铸造参数:', {
        sessionId: contractSessionId,
        students: studentsArray,
        count: addresses.length,
        tokenUri
      })

      // 调用批量铸造函数
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'batchMintAttendance',
        args: [
          BigInt(contractSessionId),
          studentsArray,
          tokenUri
        ],
      })

      console.log('批量铸造成功:', hash)
      
      // 等待交易确认
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
      const receipt = await provider.waitForTransaction(hash)
      if (receipt) {
        console.log('交易已确认，区块号:', receipt.blockNumber)
      }
      
      // 批量铸造成功后，同步出勤记录到数据库
      try {
        setMintResult(`✅ 批量铸造成功！\n\n交易哈希: ${hash}\n学生数量: ${addresses.length}\n\n正在同步出勤记录到数据库...`)
        
        const syncResponse = await fetch(`${API}/api/attendance/sync-session/${selectedSessionId}`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        })

        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          console.log('同步结果:', syncData)
          setMintResult(`✅ 批量铸造成功！\n\n交易哈希: ${hash}\n学生数量: ${addresses.length}\n\n✅ 同步完成：\n- 已同步: ${syncData.synced} 条记录\n- 已跳过: ${syncData.skipped} 条记录（已存在）\n\n出勤记录已保存到数据库，学生宠物已获得经验值。`)
        } else {
          const errorData = await syncResponse.json()
          console.error('同步失败:', errorData)
          setMintResult(`✅ 批量铸造成功！\n\n交易哈希: ${hash}\n学生数量: ${addresses.length}\n\n⚠️ 同步失败: ${errorData.error}\n\n注意：出勤记录将通过区块链事件自动同步，请稍后刷新页面查看。`)
        }
      } catch (syncError: any) {
        console.error('同步API调用失败:', syncError)
        setMintResult(`✅ 批量铸造成功！\n\n交易哈希: ${hash}\n学生数量: ${addresses.length}\n\n⚠️ 同步API调用失败: ${syncError.message}\n\n注意：出勤记录将通过区块链事件自动同步，请稍后刷新页面查看。`)
      }

    } catch (err: any) {
      console.error('批量铸造失败:', err)
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
      setMintResult(`❌ 批量铸造失败: ${errorMsg}`)
    } finally {
      setIsMinting(false)
    }
  }

  // 单个铸造NFT
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
    <div className="mint-container">
      <div className="mint-header">
        <div className="header-icon">🎓</div>
        <div className="header-content">
          <h2>教师出勤记录</h2>
          <p>为学生铸造出勤NFT，记录区块链上的学习轨迹</p>
        </div>
      </div>

      <div className="mint-form">
      {/* 课程选择 */}
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

      {/* 课次选择 */}
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

      {/* 铸造模式选择 */}
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">⚙️</span>
            铸造模式
          </label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="single"
                checked={mintMode === 'single'}
                onChange={(e) => setMintMode(e.target.value as 'single' | 'batch')}
                style={{ marginRight: '8px' }}
              />
              单个铸造
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="batch"
                checked={mintMode === 'batch'}
                onChange={(e) => setMintMode(e.target.value as 'single' | 'batch')}
                style={{ marginRight: '8px' }}
              />
              批量铸造（节省Gas）
            </label>
          </div>
          <div className="input-hint">
            {mintMode === 'batch' 
              ? '批量铸造可以一次性为多个学生铸造NFT，节省Gas费用' 
              : '单个铸造适合少量学生的出勤记录'}
          </div>
        </div>

      {/* 根据模式显示不同的输入框 */}
      {mintMode === 'single' ? (
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">👨‍🎓</span>
            学生钱包地址
          </label>
        <input
            type="text"
          value={studentAddress}
          onChange={(e) => setStudentAddress(e.target.value)}
            className="form-input"
          placeholder="0x..."
            pattern="^0x[a-fA-F0-9]{40}$"
            title="请输入有效的以太坊地址"
        />
          <div className="input-hint">
            输入学生的以太坊钱包地址，用于铸造NFT
          </div>
      </div>
      ) : (
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">👥</span>
            学生钱包地址（每行一个）
          </label>
          <textarea
            value={studentAddresses}
            onChange={(e) => setStudentAddresses(e.target.value)}
            className="form-input"
            style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '14px' }}
            placeholder="0x1234567890123456789012345678901234567890&#10;0xabcdefabcdefabcdefabcdefabcdefabcdefabcd&#10;0x9876543210987654321098765432109876543210"
          />
          <div className="input-hint">
            每行输入一个学生地址，系统会自动验证格式。已出勤的学生会被自动跳过。
            {studentAddresses && (
              <span style={{ display: 'block', marginTop: '4px', color: '#4CAF50' }}>
                已识别 {parseStudentAddresses(studentAddresses).length} 个有效地址
              </span>
            )}
          </div>
        </div>
      )}

      {/* Token URI输入 */}
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">🎨</span>
            NFT元数据URI
        </label>
          <input
            type="url"
            value={tokenUri}
            onChange={(e) => setTokenUri(e.target.value)}
            className="form-input"
            placeholder="ipfs://..."
          />
          <div className="input-hint">
            NFT的元数据链接，包含出勤证明信息
          </div>
      </div>

      {/* 铸造按钮 */}
        <div className="form-actions">
        <button
          onClick={mintMode === 'single' ? handleMint : handleBatchMint}
            disabled={isMinting || !selectedSessionId || 
              (mintMode === 'single' 
                ? !studentAddress.trim() 
                : parseStudentAddresses(studentAddresses).length === 0)}
            className={`mint-button ${isMinting ? 'loading' : ''}`}
          >
            <span className="button-icon">
              {isMinting ? '⏳' : mintMode === 'batch' ? '⚡⚡' : '⚡'}
            </span>
            <span className="button-text">
              {isMinting 
                ? '正在铸造...' 
                : mintMode === 'batch' 
                  ? `批量铸造 (${parseStudentAddresses(studentAddresses).length} 个学生)`
                  : '铸造出勤NFT'
              }
            </span>
        </button>
      </div>

      {/* 结果显示 */}
      {mintResult && (
          <div className={`result-message ${mintResult.startsWith('✅') ? 'success' : 'error'}`}>
            <div className="result-icon">
              {mintResult.startsWith('✅') ? '✅' : '❌'}
            </div>
            <div className="result-content">
              <pre className="result-text">{mintResult}</pre>
            </div>
        </div>
      )}

      {/* 调试信息 */}
        <div className="debug-info">
          <div className="debug-header">
            <span className="debug-icon">🔍</span>
            <span className="debug-title">调试信息</span>
          </div>
          <div className="debug-grid">
            <div className="debug-item">
              <span className="debug-label">合约地址:</span>
              <code className="debug-value">{contractAddress.slice(0, 10)}...</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">教师地址:</span>
              <code className="debug-value">{address?.slice(0, 10)}...</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">选中课程:</span>
              <span className="debug-value">{selectedCourseId || '未选择'}</span>
            </div>
            <div className="debug-item">
              <span className="debug-label">选中课次:</span>
              <span className="debug-value">{selectedSessionId || '未选择'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
