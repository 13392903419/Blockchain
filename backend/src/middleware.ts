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
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;
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
