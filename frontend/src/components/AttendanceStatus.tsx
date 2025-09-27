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

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

  // 调试信息
  console.log('Contract Address:', contractAddress)
  console.log('Wallet Address:', address)

  const client = useMemo(() => createPublicClient({ chain: localhost, transport: http('http://127.0.0.1:8545') }), [])

  useEffect(() => {
    if (!address || !contractAddress) {
      setAttended(null)
      return
    }
    const read = async () => {
      try {
        console.log('Reading contract...', { contractAddress, sessionId, address })
        const contract = getContract({ address: contractAddress as `0x${string}`, abi, client })
        const ok = (await contract.read.hasAttended([BigInt(sessionId), address])) as boolean
        console.log('Contract result:', ok)
        setAttended(ok)
      } catch (error) {
        console.error('Contract read error:', error)
        setAttended(null)
      }
    }
    read()
  }, [address, contractAddress, sessionId])

  return (
    <div>
      <div>合约地址: {contractAddress || '(未配置 VITE_CONTRACT_ADDRESS)'}</div>
      <div>钱包地址: {address || '(未连接)'}</div>
      <div>环境变量: {import.meta.env.VITE_CONTRACT_ADDRESS || '(未找到)'}</div>
      <div style={{ marginTop: 8 }}>
        <label>课次ID: </label>
        <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={{ width: 120 }} />
      </div>
      <div style={{ marginTop: 8 }}>
        {address ? (
          attended === null ? '...' : attended ? '已出勤' : '未出勤'
        ) : (
          '请先连接钱包'
        )}
      </div>
    </div>
  )
}


