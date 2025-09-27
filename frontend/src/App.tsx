import './App.css'
import { WagmiProvider, http, createConfig, useAccount, useConnect, useDisconnect } from 'wagmi'
import { localhost } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'
import { AttendanceStatus } from './components/AttendanceStatus'
import { TeacherBatchMint } from './components/TeacherBatchMint'
import { CourseManager } from './components/CourseManager'
import { StudentCheckin } from './components/StudentCheckin'
import { AttendanceRecords } from './components/AttendanceRecords'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
  chains: [localhost],
  connectors: [injected()],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545')
    
  },
  ssr: false
})

function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        <div>已连接: {address}</div>
        <button onClick={() => disconnect()}>断开连接</button>
      </div>
    )
  }
  const injectedConnector = connectors.find(c => c.id === 'injected') || connectors[0]
  return (
    <button onClick={() => connect({ connector: injectedConnector })} disabled={isPending}>
      连接钱包
    </button>
  )
}

function App() {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config} reconnectOnMount>
        <div style={{ padding: 24 }}>
          <h1>NFT 出勤 DApp</h1>
          <ConnectWallet />
          <div style={{ marginTop: 16 }}>
            <AttendanceStatus />
          </div>
          <div style={{ marginTop: 16 }}>
            <TeacherBatchMint />
          </div>
          <div style={{ marginTop: 16 }}>
            <StudentCheckin />
          </div>
          <div style={{ marginTop: 16 }}>
            <CourseManager />
          </div>
          <div style={{ marginTop: 16 }}>
            <AttendanceRecords />
          </div>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default App
