import './App.css'
import { WagmiProvider, http, createConfig, useAccount, useConnect, useDisconnect } from 'wagmi'
import { localhost } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'
import { AttendanceStatus } from './components/AttendanceStatus'
import { TeacherBatchMint } from './components/TeacherBatchMint'
import { CourseManager } from './components/CourseManager'
import { StudentCheckin } from './components/StudentCheckin'
import { AttendanceRecords } from './components/AttendanceRecords'
import { AttendanceReports } from './components/AttendanceReports'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'

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
        <div>
          <Navbar />
          <div className="page">
            <div className="section" id="section-header">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0' }}>
                <h1 style={{ margin: 0 }}>NFT 出勤 DApp</h1>
                <ConnectWallet />
              </div>
            </div>

            <div className="grid-two">
              <div className="section card" id="section-status">
                <h2>概览</h2>
                <AttendanceStatus />
              </div>

              <div className="section card" id="section-checkin">
                <h2>学生签到</h2>
                <StudentCheckin />
              </div>
            </div>

            <div className="grid-two">
              <div className="section card" id="section-teacher">
                <h2>教师工具</h2>
                <TeacherBatchMint />
              </div>

              <div className="section card" id="section-courses">
                <h2>课程管理</h2>
                <CourseManager />
              </div>
            </div>

            <div className="grid-two">
              <div className="section card" id="section-records">
                <h2>出勤记录</h2>
                <AttendanceRecords />
              </div>
              <div className="section card" id="section-reports">
                <h2>统计报表</h2>
                <AttendanceReports />
              </div>
            </div>
          </div>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default App
