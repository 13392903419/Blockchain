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
            <h1>区块链出勤系统</h1>
          </div>
          <p>连接您的钱包，开启智能出勤新时代</p>
          <div className="login-subtitle">
            <span className="highlight">安全可信 · 去中心化 · 永久记录</span>
          </div>
        </div>

        <div className="login-content">
          {!isConnected ? (
            <div className="connection-section">
              <div className="step-header">
                <div className="step-number">1</div>
                <h2>连接钱包</h2>
              </div>
              <p>请连接您的 MetaMask 或其他 Web3 钱包，开始使用区块链出勤系统</p>
              <div className="wallet-options">
                <button
                  className="connect-button primary"
                  onClick={() => connect({ connector: injectedConnector })}
                  disabled={isConnecting}
                >
                  <span className="button-icon">🔗</span>
                  <span className="button-text">
                    {isConnecting ? '连接中...' : '连接钱包'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-section">
              <div className="wallet-info success">
                <div className="info-header">
                  <span className="status-icon">✅</span>
                  <h2>钱包已连接</h2>
                </div>
                <div className="wallet-details">
                  <p className="wallet-address">
                    <span className="address-label">钱包地址：</span>
                    <code>{address?.slice(0, 6)}...{address?.slice(-4)}</code>
                  </p>
                  <button
                    className="disconnect-button"
                    onClick={() => disconnect()}
                  >
                    <span className="button-icon">🔌</span>
                    断开连接
                  </button>
                </div>
              </div>

              <div className="login-section">
                <div className="step-header">
                  <div className="step-number">2</div>
                  <h2>身份验证</h2>
                </div>
                <p>点击下方按钮进行身份验证，系统将自动识别您的教师或学生身份</p>
                <button
                  className="login-button primary"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  <span className="button-icon">🔐</span>
                  <span className="button-text">
                    {isLoggingIn ? '验证中...' : '验证身份'}
                  </span>
                </button>

                {loginError && (
                  <div className="error-message">
                    <span className="error-icon">❌</span>
                    <span className="error-text">{loginError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="login-footer">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👨‍🏫</div>
              <div className="feature-content">
                <h3>教师权限</h3>
                <p>创建课程、管理课次、批量记录出勤、查看统计报告</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👨‍🎓</div>
              <div className="feature-content">
                <h3>学生权限</h3>
                <p>查询出勤记录、查看NFT凭证、获取学习报告</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <div className="feature-content">
                <h3>区块链安全</h3>
                <p>不可篡改记录、透明可验证、永久保存</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <div className="feature-content">
                <h3>NFT凭证</h3>
                <p>独特出勤证明、可转让收藏、数字纪念品</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
