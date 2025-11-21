import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { createPublicClient, http, getContract } from 'viem'
import { localhost } from 'wagmi/chains'

// 极简 ABI，只包含 hasAttended(sessionId, address)
const abi = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "hasAttended",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function AttendanceStatus() {
  const { address } = useAccount()
  const [attended, setAttended] = useState<boolean | null>(null)
  const [sessionId, setSessionId] = useState<string>('1')
  const [error, setError] = useState<string>('')

  // 强制使用正确的合约地址，忽略环境变量
  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

  // 调试信息
  console.log('Contract Address:', contractAddress)
  console.log('Wallet Address:', address)

  const client = useMemo(() => createPublicClient({ chain: localhost, transport: http('http://127.0.0.1:8545') }), [])

  useEffect(() => {
    if (!address || !contractAddress) {
      setAttended(null)
      setError('')
      return
    }

    const read = async () => {
      try {
        console.log('Reading contract...', { contractAddress, sessionId, address })
        setError('')

        // 首先检查合约是否存在
        const code = await client.getBytecode({ address: contractAddress as `0x${string}` })
        if (!code || code === '0x') {
          setError('❌ 合约未部署到该地址，请先部署合约')
          setAttended(null)
          return
        }

        const contract = getContract({ address: contractAddress as `0x${string}`, abi, client })
        // 从复合sessionId中提取数字部分，如"CS-1" -> "1"
        const numericSessionId = sessionId.includes('-') ? sessionId.split('-')[1] : sessionId;
        const ok = (await contract.read.hasAttended([BigInt(numericSessionId), address])) as boolean
        console.log('Contract result:', ok)
        setAttended(ok)
      } catch (error: any) {
        console.error('Contract read error:', error)
        setAttended(null)

        // 提供更友好的错误信息
        if (error.message?.includes('connect ECONNREFUSED') || error.message?.includes('fetch')) {
          setError('❌ 无法连接到区块链网络，请确保 Hardhat 本地网络正在运行')
        } else if (error.message?.includes('returned no data') || error.message?.includes('0x')) {
          setError('❌ 合约函数调用失败，可能是合约未正确部署或函数不存在')
        } else if (error.message?.includes('contract')) {
          setError('❌ 合约调用失败，请检查合约地址是否正确')
        } else {
          setError(`❌ 读取失败: ${error.message || '未知错误'}`)
        }
      }
    }

    read()
  }, [address, contractAddress, sessionId, client])

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, marginTop: 24 }}>
      <h3>出勤状态查询</h3>

      {/* 调试信息 */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: 12 }}>
        <div>合约地址: {contractAddress}</div>
        <div>钱包地址: {address || '(未连接)'}</div>
        <div>网络: http://127.0.0.1:8545</div>
      </div>

      {/* 课次ID输入 */}
      <div style={{ marginBottom: 12 }}>
        <label>课次ID: </label>
        <input
          type="number"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          style={{ width: 120, padding: '4px 8px', marginLeft: 8 }}
        />
      </div>

      {/* 出勤状态显示 */}
      <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
        {address ? (
          attended === null ? (
            <span style={{ color: '#ffa500' }}>正在查询...</span>
          ) : attended ? (
            <span style={{ color: '#28a745' }}>✅ 已出勤</span>
          ) : (
            <span style={{ color: '#dc3545' }}>❌ 未出勤</span>
          )
        ) : (
          <span style={{ color: '#6c757d' }}>请先连接钱包</span>
        )}
      </div>

      {/* 错误信息显示 */}
      {error && (
        <div style={{
          color: '#dc3545',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}


