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
}).catch((error: any) => {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
});

// 区块链事件监听函数
async function startBlockchainListener() {
  try {
    console.log('🔍 启动区块链事件监听...');

    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    console.log('✅ 连接到区块链提供者');

    // 获取合约地址 (AttendanceNFT合约地址)
    const contractAddress = process.env.VITE_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    console.log('📋 监听合约地址:', contractAddress);

    // 创建合约实例
    const contract = new ethers.Contract(
      contractAddress,
      [
        "event AttendanceRecorded(uint256 indexed sessionId, address indexed student, uint256 tokenId)",
        "function hasAttended(uint256 sessionId, address student) view returns (bool)"
      ],
      provider
    );

    console.log('🎧 开始监听 AttendanceRecorded 事件...');

    // 监听出勤记录事件
    contract.on("AttendanceRecorded", async (contractSessionId: any, student: any, tokenId: any, event: any) => {
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
        const matchingSession = allSessions.find((session: any) => session.globalSessionId === Number(numericSessionId));

        if (!matchingSession) {
          console.error('❌ 未找到匹配的数据库session记录，Global Session ID:', numericSessionId);
          console.error('   所有可用session:', allSessions.map((s: any) => ({ id: s.id, globalSessionId: s.globalSessionId, sessionNumber: s.sessionNumber })));
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

      } catch (error: any) {
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

  } catch (error: any) {
    console.error('❌ 启动区块链事件监听失败:', error.message);
    console.error('请确保:');
    console.error('1. Hardhat本地网络正在运行 (npx hardhat node)');
    console.error('2. 合约已正确部署');
    console.error('3. 合约地址配置正确');
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
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use(limiter);

app.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

// ===== 认证相关 API =====
app.get("/auth/challenge", (_req: any, res: any) => {
  const nonce = generateChallenge();
  res.json({ nonce });
});

app.post("/auth/login", async (req: any, res: any) => {
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
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    console.log('🔍 连接到区块链提供者');

    const roleManagerContract = new ethers.Contract(
      roleManagerAddress,
      [
        "function isTeacher(address) view returns (bool)",
        "function isStudent(address) view returns (bool)"
      ],
      provider
    );
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
    } catch (contractError: any) {
      console.error(`❌ 合约查询失败:`, contractError.message);
      console.log(`使用默认角色: student`);
      role = 'student';
    }

    // 创建或更新用户记录（仅用于统计，不影响角色判断）
    let user = await db.getUser(address);
    if (!user) {
      user = await db.createUser({ address, role });
      console.log(`新用户 ${address} 创建，区块链角色: ${role}`);
    } else {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/auth/me", authenticateToken, (req: any, res: any) => {
  res.json({ user: req.user });
});

// ===== 课程管理 API =====
// 创建课程
app.post("/api/courses", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Course name is required" });
    }

    const course = await db.createCourse({
      name,
      description,
      teacherAddress: req.user!.address
    });

    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课程列表
app.get("/api/courses", authenticateToken, async (req: any, res: any) => {
  try {
    const courses = req.user!.role === 'teacher' 
      ? await db.getCoursesByTeacher(req.user!.address)
      : await db.getAllCourses();
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个课程
app.get("/api/courses/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const course = await db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新课程
app.put("/api/courses/:id", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const course = await db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress !== req.user!.address) {
      return res.status(403).json({ error: "Not authorized to update this course" });
    }

    const updatedCourse = await db.updateCourse(req.params.id!, req.body);
    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除课程
app.delete("/api/courses/:id", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const course = await db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress !== req.user!.address) {
      return res.status(403).json({ error: "Not authorized to delete this course" });
    }

    const success = await db.deleteCourse(req.params.id!);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 课次管理 API =====
// 创建课次
app.post("/api/courses/:courseId/sessions", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const { courseId } = req.params;
    const { name, description, startTime, endTime } = req.body;

    const course = await db.getCourse(courseId!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized to create sessions for this course" });
    }

    if (typeof startTime !== "number" || typeof endTime !== "number" || endTime <= startTime) {
      return res.status(400).json({ error: "Invalid session data" });
    }

    const session = await db.createSession({
      courseId: courseId!,
      // 名称由数据库层在缺省时自动填充：如 “第N次课”
      startTime,
      endTime
    });

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课次列表
app.get("/api/courses/:courseId/sessions", authenticateToken, async (req: any, res: any) => {
  try {
    const sessions = await db.getSessionsByCourse(req.params.courseId!);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个课次
app.get("/api/sessions/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const session = await db.getSession(req.params.id!);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  } catch (error: any) {
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
    outputs: [ { internalType: "uint256", name: "tokenId", type: "uint256" } ],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

app.post("/api/attendance/checkin", authenticateToken, requireStudent, async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    const studentAddress = req.user!.address;

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
    const attendanceRecord = await db.getAttendanceRecordByStudentAndSession(
      studentAddress,
      sessionId.toString()
    );

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
  } catch (error: any) {
    console.error('❌ 学生签到查询失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取出勤记录
app.get("/api/attendance/records", authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId, studentAddress } = req.query;
    
    let records: any[];
    if (sessionId) {
      records = await db.getAttendanceBySession(sessionId as string);
    } else if (studentAddress) {
      records = await db.getAttendanceByStudent(studentAddress as string);
    } else {
      // 根据用户角色返回相应记录
      if (req.user!.role === 'teacher') {
        // 教师可以看到所有记录（这里简化处理）
        records = [];
      } else {
        // 学生只能看到自己的记录
        records = await db.getAttendanceByStudent(req.user!.address);
      }
    }

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取出勤统计
app.get("/api/attendance/stats/:sessionId", authenticateToken, async (req: any, res: any ) => {
  try {
    const stats = await db.getSessionStats(req.params.sessionId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课程出勤统计
app.get("/api/courses/:courseId/stats", authenticateToken, async (req: any, res: any ) => {
  try {
    const stats = await db.getCourseStats(req.params.courseId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 统计报表 API
app.get('/api/reports/course-stats', authenticateToken, async (req: any, res: any) => {
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
  } catch (error) {
    console.error('Course stats error:', error);
    res.status(500).json({ error: 'Failed to get course statistics' });
  }
});

app.get('/api/reports/student-stats', authenticateToken, async (req: any, res: any) => {
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
  } catch (error) {
    console.error('Student stats error:', error);
    res.status(500).json({ error: 'Failed to get student statistics' });
  }
});

app.get('/api/reports/time-stats', authenticateToken, async (req: any, res: any) => {
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
      
      const sessionRecords = allRecords.filter((r: any) => r.sessionId === session.id);
      dayStat.attendance += sessionRecords.filter((r: any) => r.status === 'present').length;
      dayStat.totalPossible += sessionRecords.length;
    }

    const trends = Array.from(dateMap.values()).map(day => ({
      date: day.date,
      sessions: day.sessions,
      attendance: day.attendance,
      rate: day.totalPossible > 0 ? (day.attendance / day.totalPossible) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    const totalSessions = allSessions.length;
    const totalAttendance = allRecords.filter((r: any) => r.status === 'present').length;
    const averageRate = allRecords.length > 0 ? (totalAttendance / allRecords.length) * 100 : 0;

    res.json({
      period: 'All Time',
      totalSessions,
      totalAttendance,
      averageRate,
      trends
    });
  } catch (error) {
    console.error('Time stats error:', error);
    res.status(500).json({ error: 'Failed to get time statistics' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


