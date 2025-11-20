import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const API = 'http://localhost:4000';

// JWT token 解析函数
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 获取签名挑战
  const getChallenge = async () => {
    try {
      const response = await fetch(`${API}/auth/challenge`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.nonce;
    } catch (error) {
      console.error('Failed to get challenge:', error);
      throw new Error('无法获取签名挑战，请确保后端服务器正在运行');
    }
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        if (address) {
          localStorage.setItem('auth_address', address);
        }

        // 解析token获取用户角色
        const tokenData = parseJwt(data.token);
        if (tokenData && tokenData.role) {
          setUserRole(tokenData.role);
          localStorage.setItem('user_role', tokenData.role);
        }

        console.log('登录成功，获得token，角色:', tokenData?.role);
        return data;
      } else {
        throw new Error('登录响应中没有token');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(`登录失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setToken(null);
    setUserRole(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_address');
    localStorage.removeItem('user_role');
    // 重定向到登录页面
    window.location.reload();
  };

  // 获取认证头
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // 检查本地存储的 token 和角色
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedRole = localStorage.getItem('user_role');

    if (savedToken) {
      setToken(savedToken);
      // 尝试解析token获取角色
      const tokenData = parseJwt(savedToken);
      if (tokenData && tokenData.role) {
        setUserRole(tokenData.role);
      } else if (savedRole) {
        // 如果token解析失败，使用本地存储的角色
        setUserRole(savedRole as 'teacher' | 'student');
      }
    }
  }, []);

  // 当钱包断开连接时清除 token
  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected]);

  // 当钱包地址切换时，若与上次登录地址不一致，清除 token 以强制重新登录
  useEffect(() => {
    const savedAddress = localStorage.getItem('auth_address');
    if (address && savedAddress && savedAddress.toLowerCase() !== address.toLowerCase()) {
      logout();
    }
  }, [address]);

  return {
    address,
    isConnected,
    token,
    userRole,
    isLoading,
    login,
    logout,
    getAuthHeaders,
    isAuthenticated: !!token,
  };
}
