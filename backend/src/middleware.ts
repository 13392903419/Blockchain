import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthUser } from './auth';

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// 认证中间件
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  console.log('认证中间件 - 收到请求:', req.path);
  console.log('认证头:', authHeader);

  const token = authHeader && authHeader.split(' ')[1];
  console.log('解析出的token:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    console.log('没有token，返回401');
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyToken(token);
  console.log('token验证结果:', user ? '成功' : '失败');

  if (!user) {
    console.log('token无效，返回403');
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;
  console.log('认证成功，用户:', user.address, user.role);
  next();
}

// 教师权限中间件
export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher role required' });
  }

  next();
}

// 学生权限中间件
export function requireStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student role required' });
  }

  next();
}
