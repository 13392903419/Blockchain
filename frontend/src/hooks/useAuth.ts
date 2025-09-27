import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const API = 'http://localhost:4000';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 获取签名挑战
  const getChallenge = async () => {
    const response = await fetch(`${API}/auth/challenge`);
    const data = await response.json();
    return data.nonce;
  };

  // 登录
  const login = async () => {
    if (!address || !window.ethereum) return;

    setIsLoading(true);
    try {
      // 获取挑战
      const nonce = await getChallenge();
      
      // 签名消息
      const message = `请签名以验证身份：\n${nonce}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // 发送登录请求
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          message,
        }),
      });

      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        return data;
      } else {
        throw new Error(data.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  // 获取认证头
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // 检查本地存储的 token
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // 当钱包断开连接时清除 token
  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected]);

  return {
    address,
    isConnected,
    token,
    isLoading,
    login,
    logout,
    getAuthHeaders,
    isAuthenticated: !!token,
  };
}
