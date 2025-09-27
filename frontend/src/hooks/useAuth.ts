import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// 简化版认证Hook - 不需要后端
export function useAuth() {
  const { address, isConnected } = useAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 简化的登录 - 只需要钱包连接
  const login = async () => {
    if (!address || !window.ethereum) return;

    setIsLoading(true);
    try {
      // 简单的签名验证，不需要后端
      const message = `请签名以验证身份：\n${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // 直接设置为已认证
      setIsAuthenticated(true);
      localStorage.setItem('auth_authenticated', 'true');
      console.log('登录成功，无需后端验证');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_authenticated');
  };

  // 获取认证头 - 简化版
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // 检查本地存储的认证状态
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 当钱包断开连接时清除认证状态
  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected]);

  return {
    address,
    isConnected,
    isLoading,
    login,
    logout,
    getAuthHeaders,
    isAuthenticated,
  };
}
