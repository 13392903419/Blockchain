"use strict";
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const { generateChallenge, verifySignature, generateToken, isTeacher } = require("./auth");
const { authenticateToken, requireTeacher, requireStudent } = require("./middleware");
const { db, connectDB } = require("./database");
dotenv.config();
// 数据库连接
connectDB().then(() => {
    console.log('✅ Database connected successfully');
    // 启动区块链事件监听
    startBlockchainListener();
}).catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
});
// 全局 Provider 实例
let globalProvider = null;
function getProvider() {
    if (!globalProvider) {
        globalProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    }
    return globalProvider;
}
// 区块链事件监听函数
async function startBlockchainListener(retryCount = 0) {
    try {
        console.log(`🔍 启动区块链事件监听... (尝试 ${retryCount + 1})`);
        const provider = getProvider();
        // 简单的连接测试
        await provider.getNetwork();
        console.log('✅ 连接到区块链提供者');
        // 获取合约地址 (AttendanceNFT合约地址)
        const contractAddress = process.env.VITE_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
        console.log('📋 监听合约地址:', contractAddress);
        // 创建合约实例
        const contract = new ethers.Contract(contractAddress, [
            "event AttendanceRecorded(uint256 indexed sessionId, address indexed student, uint256 tokenId)",
            "function hasAttended(uint256 sessionId, address student) view returns (bool)"
        ], provider);
        console.log('🎧 开始监听 AttendanceRecorded 事件...');
        // 监听出勤记录事件
        contract.on("AttendanceRecorded", async (contractSessionId, student, tokenId, event) => {
            try {
                console.log('📢 监听到出勤记录事件:');
                console.log('   合约Session ID:', contractSessionId.toString());
                console.log('   Student:', student);
                console.log('   Token ID:', tokenId.toString());
                console.log('   Transaction Hash:', event.log.transactionHash);
                const numericSessionId = contractSessionId.toString();
                // 直接使用globalSessionId匹配数据库session记录
                // 区块链上的sessionId就是数据库的globalSessionId
                const allSessions = await db.getAllSessions();
                const matchingSession = allSessions.find((session) => session.globalSessionId === Number(numericSessionId));
                if (!matchingSession) {
                    console.error('❌ 未找到匹配的数据库session记录，Global Session ID:', numericSessionId);
                    console.error('   所有可用session:', allSessions.map((s) => ({ id: s.id, globalSessionId: s.globalSessionId, sessionNumber: s.sessionNumber })));
                    return;
                }
                const dbSessionId = matchingSession.id;
                console.log('✅ 找到匹配的数据库Session:', dbSessionId, '(Global Session ID:', matchingSession.globalSessionId, ')');
                // 检查数据库中是否已有记录
                const existingRecord = await db.getAttendanceRecordByStudentAndSession(student, dbSessionId);
                if (existingRecord) {
                    console.log('⚠️  记录已存在，跳过保存');
                    return;
                }
                // 保存到数据库
                const attendanceRecord = await db.createAttendanceRecord({
                    sessionId: dbSessionId,
                    studentAddress: student,
                    tokenId: tokenId.toString(),
                    txHash: event.log.transactionHash,
                    status: 'present'
                });
                console.log('✅ 出勤记录已保存到数据库:', attendanceRecord.id);
                console.log('   记录详情:', {
                    sessionId: attendanceRecord.sessionId,
                    studentAddress: attendanceRecord.studentAddress,
                    tokenId: attendanceRecord.tokenId,
                    txHash: attendanceRecord.txHash,
                    status: attendanceRecord.status
                });
                // 给学生宠物增加经验值 (+5 XP)
                try {
                    const pet = await db.getStudentPet(student);
                    const currentExp = pet ? pet.experience : 0;
                    const newExp = currentExp + 5; // 出勤记录奖励5经验值
                    const newStage = Math.floor(newExp / 100); // 每100 XP升一级
                    await db.createOrUpdateStudentPet(student, {
                        stage: Math.min(newStage, 2), // 最多升到花朵阶段
                        experience: newExp
                    });
                    console.log(`🎉 学生 ${student} 出勤成功！获得5 XP奖励，当前经验值: ${newExp}`);
                }
                catch (petError) {
                    console.warn('宠物经验值更新失败:', petError);
                    // 不影响出勤记录的主流程
                }
            }
            catch (error) {
                console.error('❌ 处理出勤记录事件失败:', error.message);
                console.error('   错误详情:', error);
                console.error('   事件数据:', {
                    contractSessionId: contractSessionId?.toString(),
                    student,
                    tokenId: tokenId?.toString(),
                    txHash: event?.log?.transactionHash
                });
            }
        });
        console.log('✅ 区块链事件监听器已启动');
    }
    catch (error) {
        console.error('❌ 启动区块链事件监听失败:', error.message);
        if (retryCount < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`⏳ ${delay / 1000}秒后重试...`);
            setTimeout(() => startBlockchainListener(retryCount + 1), delay);
        }
        else {
            console.error('❌ 重试次数过多，放弃监听。请检查区块链网络状态。');
            console.error('请确保:');
            console.error('1. Hardhat本地网络正在运行 (npx hardhat node)');
            console.error('2. 合约已正确部署');
            console.error('3. 合约地址配置正确');
        }
    }
}
const app = express();
// 安全中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
// 限流
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 1000 // 限制每个IP 15分钟内最多1000个请求 (Increased for dev)
});
app.use(limiter);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// ===== 认证相关 API =====
app.get("/auth/challenge", (_req, res) => {
    const nonce = generateChallenge();
    res.json({ nonce });
});
app.post("/auth/login", async (req, res) => {
    try {
        const { address, signature, message } = req.body;
        if (!address || !signature || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // 验证签名
        if (!verifySignature(address, signature, message)) {
            return res.status(401).json({ error: "Invalid signature" });
        }
        // 从区块链查询用户角色
        const roleManagerAddress = process.env.CONTRACT_ADDRESS;
        console.log(`🔍 登录调试 - 合约地址: ${roleManagerAddress}`);
        console.log(`🔍 登录调试 - 用户地址: ${address}`);
        if (!roleManagerAddress) {
            console.error('❌ RoleManager contract not configured - CONTRACT_ADDRESS环境变量未设置');
            return res.status(500).json({ error: "RoleManager contract not configured" });
        }
        // 连接到RoleManager合约
        const provider = getProvider();
        console.log('🔍 连接到区块链提供者');
        const roleManagerContract = new ethers.Contract(roleManagerAddress, [
            "function isTeacher(address) view returns (bool)",
            "function isStudent(address) view returns (bool)"
        ], provider);
        console.log('🔍 RoleManager合约实例创建成功');
        // 查询区块链上的角色
        let role = 'student'; // 默认角色
        try {
            const isTeacherRole = await roleManagerContract.isTeacher(address);
            const isStudentRole = await roleManagerContract.isStudent(address);
            role = isTeacherRole ? 'teacher' : 'student';
            console.log(`✅ 区块链查询结果:`);
            console.log(`   用户地址: ${address}`);
            console.log(`   isTeacher: ${isTeacherRole}`);
            console.log(`   isStudent: ${isStudentRole}`);
            console.log(`   最终角色: ${role}`);
        }
        catch (contractError) {
            console.error(`❌ 合约查询失败:`, contractError.message);
            console.log(`使用默认角色: student`);
            role = 'student';
        }
        // 创建或更新用户记录（仅用于统计，不影响角色判断）
        let user = await db.getUser(address);
        if (!user) {
            user = await db.createUser({ address, role });
            console.log(`新用户 ${address} 创建，区块链角色: ${role}`);
        }
        else {
            // 更新角色（以防区块链上角色有变更）
            user = await db.updateUser(address, { role });
        }
        // 生成JWT token
        const token = generateToken({ address, role, nonce: message });
        res.json({
            token,
            user: { address, role },
            message: "Login successful"
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/auth/me", authenticateToken, (req, res) => {
    res.json({ user: req.user });
});
// ===== 课程管理 API =====
// 创建课程
app.post("/api/courses", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Course name is required" });
        }
        const course = await db.createCourse({
            name,
            description,
            teacherAddress: req.user.address
        });
        res.json(course);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取课程列表
app.get("/api/courses", authenticateToken, async (req, res) => {
    try {
        const courses = req.user.role === 'teacher'
            ? await db.getCoursesByTeacher(req.user.address)
            : await db.getAllCourses();
        res.json(courses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取单个课程
app.get("/api/courses/:id", authenticateToken, async (req, res) => {
    try {
        const course = await db.getCourse(req.params.id);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        res.json(course);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 更新课程
app.put("/api/courses/:id", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const course = await db.getCourse(req.params.id);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.teacherAddress !== req.user.address) {
            return res.status(403).json({ error: "Not authorized to update this course" });
        }
        const updatedCourse = await db.updateCourse(req.params.id, req.body);
        res.json(updatedCourse);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 删除课程
app.delete("/api/courses/:id", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const course = await db.getCourse(req.params.id);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.teacherAddress !== req.user.address) {
            return res.status(403).json({ error: "Not authorized to delete this course" });
        }
        const success = await db.deleteCourse(req.params.id);
        res.json({ success });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ===== 课次管理 API =====
// 创建课次
app.post("/api/courses/:courseId/sessions", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { name, description, startTime, endTime } = req.body;
        const course = await db.getCourse(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.teacherAddress.toLowerCase() !== req.user.address.toLowerCase()) {
            return res.status(403).json({ error: "Not authorized to create sessions for this course" });
        }
        if (typeof startTime !== "number" || typeof endTime !== "number" || endTime <= startTime) {
            return res.status(400).json({ error: "Invalid session data" });
        }
        const session = await db.createSession({
            courseId: courseId,
            // 名称由数据库层在缺省时自动填充：如 “第N次课”
            startTime,
            endTime
        });
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取课次列表
app.get("/api/courses/:courseId/sessions", authenticateToken, async (req, res) => {
    try {
        const sessions = await db.getSessionsByCourse(req.params.courseId);
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取单个课次
app.get("/api/sessions/:id", authenticateToken, async (req, res) => {
    try {
        const session = await db.getSession(req.params.id);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ===== 出勤管理 API =====
// 学生签到（后端代签，MVP）
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const ownerPk = process.env.OWNER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// 默认使用首笔部署的确定性地址，避免与前端不一致导致 500
const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const attendanceAbi = [
    {
        inputs: [
            { internalType: "uint256", name: "sessionId", type: "uint256" },
            { internalType: "address", name: "student", type: "address" },
            { internalType: "string", name: "tokenUri", type: "string" }
        ],
        name: "mintAttendance",
        outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function"
    }
];
app.post("/api/attendance/checkin", authenticateToken, requireStudent, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const studentAddress = req.user.address;
        if (typeof sessionId !== "number" && typeof sessionId !== "string") {
            return res.status(400).json({ error: "Invalid sessionId" });
        }
        // 检查课次是否存在
        const session = await db.getSession(sessionId.toString());
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        console.log('🔍 学生签到查询:', {
            requestedSessionId: sessionId,
            studentAddress: studentAddress,
            foundSession: {
                id: session.id,
                sessionNumber: session.sessionNumber,
                globalSessionId: session.globalSessionId,
                name: session.name,
                courseId: session.courseId
            }
        });
        // 查询该学生的出勤记录（由教师铸造产生）
        const attendanceRecord = await db.getAttendanceRecordByStudentAndSession(studentAddress, sessionId.toString());
        if (!attendanceRecord) {
            return res.status(404).json({
                error: "No attendance record found. Please contact your teacher if you believe this is an error.",
                checkedIn: false
            });
        }
        console.log('✅ 找到出勤记录:', {
            sessionId: attendanceRecord.sessionId,
            studentAddress: attendanceRecord.studentAddress,
            tokenId: attendanceRecord.tokenId,
            txHash: attendanceRecord.txHash,
            status: attendanceRecord.status,
            timestamp: attendanceRecord.timestamp
        });
        res.json({
            checkedIn: true,
            record: attendanceRecord,
            message: "Attendance record found successfully"
        });
    }
    catch (error) {
        console.error('❌ 学生签到查询失败:', error);
        res.status(500).json({ error: error.message });
    }
});
// 获取出勤记录
app.get("/api/attendance/records", authenticateToken, async (req, res) => {
    try {
        const { sessionId, studentAddress } = req.query;
        let records;
        if (sessionId) {
            records = await db.getAttendanceBySession(sessionId);
        }
        else if (studentAddress) {
            records = await db.getAttendanceByStudent(studentAddress);
        }
        else {
            // 根据用户角色返回相应记录
            if (req.user.role === 'teacher') {
                // 教师可以看到所有记录（这里简化处理）
                records = [];
            }
            else {
                // 学生只能看到自己的记录
                records = await db.getAttendanceByStudent(req.user.address);
            }
        }
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取出勤统计
app.get("/api/attendance/stats/:sessionId", authenticateToken, async (req, res) => {
    try {
        const stats = await db.getSessionStats(req.params.sessionId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取课程出勤统计
app.get("/api/courses/:courseId/stats", authenticateToken, async (req, res) => {
    try {
        const stats = await db.getCourseStats(req.params.courseId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 统计报表 API
app.get('/api/reports/course-stats', authenticateToken, async (req, res) => {
    try {
        const courses = await db.getAllCourses();
        const courseStats = [];
        for (const course of courses) {
            const sessions = await db.getSessionsByCourse(course.id);
            const courseStat = await db.getCourseStats(course.id);
            const attendanceRecords = [];
            for (const session of sessions) {
                const sessionStats = await db.getSessionStats(session.id);
                attendanceRecords.push({
                    sessionId: session.id,
                    sessionName: session.name,
                    attendanceRate: sessionStats.attendanceRate,
                    presentCount: sessionStats.presentCount,
                    totalCount: sessionStats.totalStudents
                });
            }
            courseStats.push({
                courseId: course.id,
                courseName: course.name,
                totalSessions: courseStat.totalSessions,
                totalStudents: courseStat.totalAttendance,
                averageAttendanceRate: courseStat.averageAttendanceRate,
                attendanceRecords
            });
        }
        res.json(courseStats);
    }
    catch (error) {
        console.error('Course stats error:', error);
        res.status(500).json({ error: 'Failed to get course statistics' });
    }
});
app.get('/api/reports/student-stats', authenticateToken, async (req, res) => {
    try {
        const allRecords = await db.getAllAttendanceRecords();
        const studentMap = new Map();
        for (const record of allRecords) {
            if (!studentMap.has(record.studentAddress)) {
                studentMap.set(record.studentAddress, {
                    studentAddress: record.studentAddress,
                    totalSessions: 0,
                    attendedSessions: 0,
                    attendanceHistory: []
                });
            }
            const studentStat = studentMap.get(record.studentAddress);
            studentStat.totalSessions++;
            if (record.status === 'present') {
                studentStat.attendedSessions++;
            }
            // 获取会话和课程信息
            const session = await db.getSession(record.sessionId);
            const course = session ? await db.getCourse(session.courseId) : null;
            studentStat.attendanceHistory.push({
                sessionId: record.sessionId,
                sessionName: session?.name || 'Unknown Session',
                courseName: course?.name || 'Unknown Course',
                status: record.status,
                timestamp: record.timestamp
            });
        }
        const studentStats = Array.from(studentMap.values()).map(student => ({
            ...student,
            attendanceRate: student.totalSessions > 0 ? (student.attendedSessions / student.totalSessions) * 100 : 0
        }));
        res.json(studentStats);
    }
    catch (error) {
        console.error('Student stats error:', error);
        res.status(500).json({ error: 'Failed to get student statistics' });
    }
});
app.get('/api/reports/time-stats', authenticateToken, async (req, res) => {
    try {
        const allRecords = await db.getAllAttendanceRecords();
        const allSessions = await db.getAllSessions();
        // 按日期分组
        const dateMap = new Map();
        for (const session of allSessions) {
            const date = new Date(session.startTime).toISOString().split('T')[0];
            if (!dateMap.has(date)) {
                dateMap.set(date, {
                    date,
                    sessions: 0,
                    attendance: 0,
                    totalPossible: 0
                });
            }
            const dayStat = dateMap.get(date);
            dayStat.sessions++;
            const sessionRecords = allRecords.filter((r) => r.sessionId === session.id);
            dayStat.attendance += sessionRecords.filter((r) => r.status === 'present').length;
            dayStat.totalPossible += sessionRecords.length;
        }
        const trends = Array.from(dateMap.values()).map(day => ({
            date: day.date,
            sessions: day.sessions,
            attendance: day.attendance,
            rate: day.totalPossible > 0 ? (day.attendance / day.totalPossible) * 100 : 0
        })).sort((a, b) => a.date.localeCompare(b.date));
        const totalSessions = allSessions.length;
        const totalAttendance = allRecords.filter((r) => r.status === 'present').length;
        const averageRate = allRecords.length > 0 ? (totalAttendance / allRecords.length) * 100 : 0;
        res.json({
            period: 'All Time',
            totalSessions,
            totalAttendance,
            averageRate,
            trends
        });
    }
    catch (error) {
        console.error('Time stats error:', error);
        res.status(500).json({ error: 'Failed to get time statistics' });
    }
});
// ===== Advanced Features APIs =====
// 1. Certificates (SBT)
app.post("/api/certificates", authenticateToken, requireTeacher, async (req, res) => {
    try {
        console.log('收到证书创建请求，用户信息:', req.user);
        console.log('请求体:', req.body);
        const { studentAddress, name, description, tokenId, txHash } = req.body;
        // 验证必需字段
        if (!studentAddress || !name) {
            console.log('缺少必需字段:', { studentAddress, name });
            return res.status(400).json({ error: '缺少必需字段: studentAddress 和 name' });
        }
        console.log('开始创建证书...');
        const cert = await db.createCertificate({
            studentAddress,
            name,
            description,
            tokenId,
            txHash
        });
        // 如果证书创建成功，给学生宠物增加经验值 (+50 XP)
        try {
            const pet = await db.getStudentPet(studentAddress);
            const currentExp = pet ? pet.experience : 0;
            const newExp = currentExp + 50; // 颁发证书奖励50经验值
            const newStage = Math.floor(newExp / 100); // 每100 XP升一级
            await db.createOrUpdateStudentPet(studentAddress, {
                stage: Math.min(newStage, 2), // 最多升到花朵阶段
                experience: newExp
            });
            console.log(`🎉 学生 ${studentAddress} 获得证书！获得50 XP奖励，当前经验值: ${newExp}`);
        }
        catch (petError) {
            console.warn('宠物经验值更新失败:', petError);
            // 不影响颁发证书的主流程
        }
        console.log('证书创建成功:', cert);
        res.json(cert);
    }
    catch (error) {
        console.error('证书创建失败:', error);
        res.status(500).json({ error: `证书创建失败: ${error.message}` });
    }
});
app.get("/api/certificates", authenticateToken, async (req, res) => {
    try {
        const studentAddress = req.query.studentAddress || req.user.address;
        const certs = await db.getCertificatesByStudent(studentAddress);
        res.json(certs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 2. Student Work (IP)
app.post("/api/student-work", authenticateToken, requireStudent, async (req, res) => {
    try {
        const { title, description, fileUrl, tokenId, txHash } = req.body;
        const work = await db.createStudentWork({
            studentAddress: req.user.address,
            title,
            description,
            fileUrl,
            tokenId,
            txHash
        });
        // 如果作品创建成功，给学生宠物增加经验值 (+10 XP)
        try {
            const pet = await db.getStudentPet(req.user.address);
            const currentExp = pet ? pet.experience : 0;
            const newExp = currentExp + 10; // 铸造作品奖励10经验值
            const newStage = Math.floor(newExp / 100); // 每100 XP升一级
            await db.createOrUpdateStudentPet(req.user.address, {
                stage: Math.min(newStage, 2), // 最多升到花朵阶段
                experience: newExp
            });
            console.log(`🎉 学生 ${req.user.address} 铸造作品成功！获得10 XP奖励，当前经验值: ${newExp}`);
        }
        catch (petError) {
            console.warn('宠物经验值更新失败:', petError);
            // 不影响铸造作品的主流程
        }
        res.json(work);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/student-work", authenticateToken, async (req, res) => {
    try {
        const studentAddress = req.query.studentAddress;
        const works = await db.getStudentWorks(studentAddress);
        res.json(works);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/student-work/:id/endorse", authenticateToken, requireTeacher, async (req, res) => {
    try {
        // 先认证作品
        const work = await db.endorseStudentWork(req.params.id);
        // 如果认证成功，给学生宠物增加经验值 (+30 XP)
        if (work && work.studentAddress) {
            try {
                const pet = await db.getStudentPet(work.studentAddress);
                const currentExp = pet ? pet.experience : 0;
                const newExp = currentExp + 30; // 认证作品奖励30经验值
                const newStage = Math.floor(newExp / 100); // 每100 XP升一级
                await db.createOrUpdateStudentPet(work.studentAddress, {
                    stage: Math.min(newStage, 2), // 最多升到花朵阶段
                    experience: newExp
                });
                console.log(`🎉 学生 ${work.studentAddress} 作品认证成功！获得30 XP奖励，当前经验值: ${newExp}`);
            }
            catch (petError) {
                console.warn('宠物经验值更新失败:', petError);
                // 不影响认证作品的主流程
            }
        }
        res.json(work);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 3. Access Pass
app.post("/api/access-pass", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { studentAddress, passType, amount, tokenId, txHash } = req.body;
        const pass = await db.createAccessPass({
            studentAddress,
            passType,
            amount,
            tokenId,
            txHash
        });
        res.json(pass);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/access-pass", authenticateToken, async (req, res) => {
    try {
        const studentAddress = req.query.studentAddress || req.user.address;
        const passes = await db.getAccessPasses(studentAddress);
        res.json(passes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/access-pass/:id/redeem", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('收到通行证兑换请求，通行证ID:', id, '用户:', req.user?.address);
        // 首先获取通行证信息，确认所有权
        const passes = await db.getAccessPasses(req.user.address);
        const pass = passes.find((p) => p._id === id);
        if (!pass) {
            return res.status(404).json({ error: '通行证不存在或不属于当前用户' });
        }
        if (pass.isRedeemed) {
            return res.status(400).json({ error: '通行证已被兑换' });
        }
        // 兑换通行证
        const updatedPass = await db.redeemAccessPass(id);
        console.log('通行证兑换成功:', updatedPass);
        // 如果兑换成功，给学生宠物增加经验值 (+20 XP)
        try {
            const pet = await db.getStudentPet(req.user.address);
            const currentExp = pet ? pet.experience : 0;
            const newExp = currentExp + 20; // 兑换通行证奖励20经验值
            const newStage = Math.floor(newExp / 100); // 每100 XP升一级
            await db.createOrUpdateStudentPet(req.user.address, {
                stage: Math.min(newStage, 2), // 最多升到花朵阶段
                experience: newExp
            });
            console.log(`🎉 学生 ${req.user.address} 兑换通行证成功！获得20 XP奖励，当前经验值: ${newExp}`);
        }
        catch (petError) {
            console.warn('宠物经验值更新失败:', petError);
            // 不影响兑换通行证的主流程
        }
        res.json(updatedPass);
    }
    catch (error) {
        console.error('通行证兑换失败:', error);
        res.status(500).json({ error: `通行证兑换失败: ${error.message}` });
    }
});
// 4. Student Pet (Dynamic NFT)
app.get("/api/student-pet", authenticateToken, async (req, res) => {
    try {
        const studentAddress = req.query.studentAddress || req.user.address;
        const pet = await db.getStudentPet(studentAddress);
        res.json(pet || { stage: 0, experience: 0 }); // Default if no pet
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/student-pet/update", authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { studentAddress, stage, experience, tokenId } = req.body;
        const pet = await db.createOrUpdateStudentPet(studentAddress, {
            stage,
            experience,
            tokenId
        });
        res.json(pet);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 5. Gallery APIs - 作品画廊
app.get("/api/gallery", authenticateToken, async (req, res) => {
    try {
        const works = await db.getGalleryWorks();
        res.json(works);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 点赞作品
app.post("/api/student-work/:id/like", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userAddress = req.user.address;
        // 检查是否已经点赞
        const hasLiked = await db.hasLiked(id, userAddress);
        if (hasLiked) {
            return res.status(400).json({ error: '已经点赞过了' });
        }
        const like = await db.addLike(id, userAddress);
        const likesCount = await db.getLikesCount(id);
        res.json({ like, likesCount });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取消点赞
app.delete("/api/student-work/:id/like", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userAddress = req.user.address;
        const removedLike = await db.removeLike(id, userAddress);
        const likesCount = await db.getLikesCount(id);
        res.json({ removed: !!removedLike, likesCount });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 检查是否已点赞
app.get("/api/student-work/:id/like", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userAddress = req.user.address;
        const hasLiked = await db.hasLiked(id, userAddress);
        const likesCount = await db.getLikesCount(id);
        res.json({ hasLiked, likesCount });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 添加评论
app.post("/api/student-work/:id/comment", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userAddress = req.user.address;
        if (!content || !content.trim()) {
            return res.status(400).json({ error: '评论内容不能为空' });
        }
        const comment = await db.addComment(id, userAddress, content.trim());
        res.json(comment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 获取作品评论
app.get("/api/student-work/:id/comments", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await db.getComments(id);
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 6. POAP Synthesis (Placeholder for logic)
app.post("/api/poap/synthesize", authenticateToken, requireStudent, async (req, res) => {
    // In a real implementation, this might check eligibility or record the synthesis event
    // For now, we assume the synthesis happens on-chain and we just record it if needed
    res.json({ message: "Synthesis logic to be implemented" });
});
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map