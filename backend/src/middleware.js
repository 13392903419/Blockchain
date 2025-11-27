"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = exports.requireTeacher = exports.authenticateToken = void 0;
const auth_1 = require("./auth");
// 认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    console.log('🔐 认证中间件 - 收到请求:', req.path, req.method);
    console.log('🔐 认证头存在:', !!authHeader);
    if (authHeader) {
        console.log('🔐 认证头格式:', authHeader.substring(0, 20) + '...');
    }
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🔐 解析出的token存在:', !!token);
    if (!token) {
        console.log('❌ 没有token，返回401');
        return res.status(401).json({ error: 'Access token required' });
    }
    const user = (0, auth_1.verifyToken)(token);
    console.log('🔐 token验证结果:', user ? '成功' : '失败');
    if (user) {
        console.log('🔐 用户信息:', { address: user.address, role: user.role });
    }
    else {
        console.log('❌ token无效，返回403');
        return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    console.log('✅ 认证成功，继续处理请求');
    next();
}
exports.authenticateToken = authenticateToken;
// 教师权限中间件
function requireTeacher(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Teacher role required' });
    }
    next();
}
exports.requireTeacher = requireTeacher;
// 学生权限中间件
function requireStudent(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Student role required' });
    }
    next();
}
exports.requireStudent = requireStudent;
//# sourceMappingURL=middleware.js.map