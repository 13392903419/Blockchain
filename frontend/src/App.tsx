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

  // 未认证用户显示登录页面
  if (!isAuthenticated || !userRole) {
    return <LoginPage />
  }

  // 根据角色显示对应页面
  if (userRole === 'teacher') {
    return <TeacherDashboard />
  } else if (userRole === 'student') {
    return <StudentDashboard />
  } else {
    // 如果角色未知，显示登录页面重新验证
    return <LoginPage />
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
