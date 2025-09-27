import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

// 合约 ABI - 包含批量铸造函数
const contractABI = [
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
  },
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

export function TeacherBatchMint() {
  const { address } = useAccount()
  const [sessionId, setSessionId] = useState<string>('1')
  const [studentAddresses, setStudentAddresses] = useState<string>('')
  const [tokenUri, setTokenUri] = useState<string>('ipfs://metadata')
  const [isMinting, setIsMinting] = useState(false)

  const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9') as `0x${string}`

  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const isProcessing = isPending || isConfirming || isMinting

  // 监听交易状态变化，当交易完成时重置 isMinting 状态
  useEffect(() => {
    if (isConfirmed || error) {
      setIsMinting(false)
    }
  }, [isConfirmed, error])

  const handleBatchMint = async () => {
    if (!contractAddress || !studentAddresses.trim()) {
      alert('请填写合约地址和学生地址')
      return
    }

    // 解析学生地址列表
    const addresses = studentAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    if (addresses.length === 0) {
      alert('请输入至少一个学生地址')
      return
    }

    // 验证地址格式
    const invalidAddresses = addresses.filter(addr => !addr.match(/^0x[a-fA-F0-9]{40}$/))
    if (invalidAddresses.length > 0) {
      alert(`以下地址格式不正确: ${invalidAddresses.join(', ')}`)
      return
    }

    setIsMinting(true)

    try {
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'batchMintAttendance',
        args: [BigInt(sessionId), addresses as `0x${string}`[], tokenUri],
      })
    } catch (err: any) {
      console.error('铸造失败:', err)
      alert(`铸造失败: ${err.message || '请检查权限和参数'}`)
      setIsMinting(false)
    }
  }

  const handleSingleMint = async () => {
    if (!contractAddress || !studentAddresses.trim()) {
      alert('请填写合约地址和学生地址')
      return
    }

    const address = studentAddresses.trim()
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('学生地址格式不正确')
      return
    }

    setIsMinting(true)

    try {
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'mintAttendance',
        args: [BigInt(sessionId), address as `0x${string}`, tokenUri],
      })
    } catch (err: any) {
      console.error('铸造失败:', err)
      alert(`铸造失败: ${err.message || '请检查权限和参数'}`)
      setIsMinting(false)
    }
  }

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 20 }}>
      <h3>教师端 - 批量铸造出勤NFT</h3>
      
      <div style={{ marginBottom: 16 }}>
        <label>课次ID: </label>
        <input 
          value={sessionId} 
          onChange={(e) => setSessionId(e.target.value)} 
          style={{ width: 120, marginLeft: 8 }}
          placeholder="1"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>学生地址 (每行一个): </label>
        <textarea 
          value={studentAddresses} 
          onChange={(e) => setStudentAddresses(e.target.value)} 
          style={{ width: '100%', height: 100, marginTop: 8 }}
          placeholder="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&#10;0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>NFT元数据URI: </label>
        <input 
          value={tokenUri} 
          onChange={(e) => setTokenUri(e.target.value)} 
          style={{ width: 300, marginLeft: 8 }}
          placeholder="ipfs://metadata"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={handleSingleMint} 
          disabled={isProcessing}
          style={{ marginRight: 8, padding: '8px 16px' }}
        >
          {isProcessing ? '铸造中...' : '单个铸造'}
        </button>
        
        <button 
          onClick={handleBatchMint} 
          disabled={isProcessing}
          style={{ padding: '8px 16px' }}
        >
          {isProcessing ? '批量铸造中...' : '批量铸造'}
        </button>
      </div>

      {hash && (
        <div style={{ marginTop: 16 }}>
          <div>交易哈希: {hash}</div>
          <div>状态: {isConfirming ? '确认中...' : isConfirmed ? '✅ 成功' : '⏳ 等待确认'}</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, color: 'red' }}>
          错误: {error.message}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
        <div>当前连接地址: {address}</div>
        <div>合约地址: {contractAddress}</div>
        <div>注意: 只有合约所有者才能执行铸造操作</div>
      </div>
  