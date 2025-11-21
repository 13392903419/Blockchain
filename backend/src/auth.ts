import { ethers } from 'ethers';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  address: string;
  role: 'teacher' | 'student';
  nonce: string;
}

// 生成签名挑战
export function generateChallenge(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 验证钱包签名
export function verifySignature(
  address: string,
  signature: string,
  message: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// 生成JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { address: user.address, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// 验证JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    console.log('开始验证token...');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('token解码成功:', { address: decoded.address, role: decoded.role, exp: decoded.exp });

    // 检查是否过期
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.log('token已过期');
      return null;
    }

    return {
      address: decoded.address,
      role: decoded.role,
      nonce: ''
    };
  } catch (error) {
    console.log('token验证失败:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// 检查是否为教师（简化版：检查是否为合约owner）
export function isTeacher(address: string, ownerAddress: string): boolean {
  return address.toLowerCase() === ownerAddress.toLowerCase();
}
