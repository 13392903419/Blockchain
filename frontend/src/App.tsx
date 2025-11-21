import './App.css'
import { WagmiProvider, http, createConfig } from 'wagmi'
import { localhost } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/LoginPage'
import { TeacherDashboard } from './components/TeacherDashboard'
import { StudentDashboard } from './components/StudentDashboard'

const config = createConfig({
  chains: [localhost],
  connectors: [injected()],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545')
  },
  ssr: false
})

function AppContent() {
  const { isAuthenticated, userRole } = useAuth()

  console.log('AppContent render - isAuthenticated:', isAuthenticated, 'userRole:', userRole)

  // 使用认证状态作为key，强制组件在认证状态改变时重新挂载
  const authKey = `${isAuthenticated}-${userRole || 'none'}`

  // 未认证用户显示登录页面
  if (!isAuthenticated || !userRole) {
    console.log('Showing login page')
    return <LoginPage key={authKey} />
  }

  // 根据角色显示对应页面
  if (userRole === 'teacher') {
    console.log('Showing teacher dashboard')
    return <TeacherDashboard key={authKey} />
  } else if (userRole === 'student') {
    console.log('Showing student dashboard')
    return <StudentDashboard key={authKey} />
  } else {
    console.log('Unknown role, showing login page')
    // 如果角色未知，显示登录页面重新验证
    return <LoginPage key={authKey} />
  }
}

function App() {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config} reconnectOnMount>
        <AppContent />
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default App
