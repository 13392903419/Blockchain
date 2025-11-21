import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { login, isLoading: isLoggingIn, isAuthenticated, userRole } = useAuth()

  const [loginError, setLoginError] = useState<string>('')

  const handleLogin = async () => {
    try {
      setLoginError('')
      console.log('开始登录...')
      const result = await login()
      console.log('登录结果:', result)
      console.log('当前认证状态 - isAuthenticated:', isAuthenticated, 'userRole:', userRole)
    } catch (error: any) {
      console.error('登录失败:', error)
      setLoginError(error.message)
    }
  }

  const injectedConnector = connectors.find(c => c.id === 'injected') || connectors[0]

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <span className="logo-icon">🎓</span>
            <h1>NFT 出勤系统</h1>
          </div>
          <p>连接您的钱包，开始使用区块链出勤系统</p>
        </div>

        <div className="login-content">
          {!isConnected ? (
            <div className="connection-section">
              <h2>第一步：连接钱包</h2>
              <p>请连接您的 MetaMask 或其他 Web3 钱包</p>
              <button
                className="connect-button primary"
                onClick={() => connect({ connector: injectedConnector })}
                disabled={isConnecting}
              >
                {isConnecting ? '连接中...' : '🔗 连接钱包'}
              </button>
            </div>
          ) : (
            <div className="auth-section">
              <div className="wallet-info">
                <h2>✅ 钱包已连接</h2>
                <p className="wallet-address">
                  地址: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <button
                  className="disconnect-button"
                  onClick={() => disconnect()}
                >
                  断开连接
                </button>
              </div>

              <div className="login-section">
                <h2>第二步：身份验证</h2>
                <p>点击下方按钮进行身份验证，系统将自动识别您的角色</p>
                <button
                  className="login-button primary"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? '验证中...' : '🔐 验证身份'}
                </button>

                {loginError && (
                  <div className="error-message">
                    <span>❌ {loginError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="login-footer">
          <div className="role-info">
            <div className="role-item">
              <span className="role-icon">👨‍🏫</span>
              <span>教师：可创建和管理课程、查看所有出勤记录</span>
            </div>
            <div className="role-item">
              <span className="role-icon">👨‍🎓</span>
              <span>学生：可进行签到、查看个人出勤记录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
