"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTeacher = exports.verifyToken = exports.generateToken = exports.verifySignature = exports.generateChallenge = void 0;
const ethers_1 = require("ethers");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// 生成签名挑战
function generateChallenge() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
exports.generateChallenge = generateChallenge;
// 验证钱包签名
function verifySignature(address, signature, message) {
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    }
    catch {
        return false;
    }
}
exports.verifySignature = verifySignature;
// 生成JWT token
function generateToken(user) {
    return jwt.sign({ address: user.address, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}
exports.generateToken = generateToken;
// 验证JWT token
function verifyToken(token) {
    try {
        console.log('开始验证token...');
        const decoded = jwt.verify(token, JWT_SECRET);
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
    }
    catch (error) {
        console.log('token验证失败:', error instanceof Error ? error.message : String(error));
        return null;
    }
}
exports.verifyToken = verifyToken;
// 检查是否为教师（简化版：检查是否为合约owner）
function isTeacher(address, ownerAddress) {
    return address.toLowerCase() === ownerAddress.toLowerCase();
}
exports.isTeacher = isTeacher;
//# sourceMappingURL=auth.js.map