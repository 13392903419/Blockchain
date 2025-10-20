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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      address: decoded.address,
      role: decoded.role,
      nonce: ''
    };
  } catch {
    return null;
  }
}

// 检查是否为教师（简化版：检查是否为合约owner）
export function isTeacher(address: string, ownerAddress: string): boolean {
  return address.toLowerCase() === ownerAddress.toLowerCase();
}
