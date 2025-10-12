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
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
});

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

    // 确定用户角色
    const ownerAddress = process.env.OWNER_PRIVATE_KEY ? 
      new ethers.Wallet(process.env.OWNER_PRIVATE_KEY).address : '';
    const role = isTeacher(address, ownerAddress) ? 'teacher' : 'student';

    // 创建或更新用户
    let user = db.getUser(address);
    if (!user) {
      user = db.createUser({ address, role });
    } else {
      user = db.updateUser(address, { role });
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
app.post("/api/courses", authenticateToken, requireTeacher, (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Course name is required" });
    }

    const course = db.createCourse({
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
app.get("/api/courses", authenticateToken, (req: any, res: any) => {
  try {
    const courses = req.user!.role === 'teacher' 
      ? db.getCoursesByTeacher(req.user!.address)
      : db.getAllCourses();
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个课程
app.get("/api/courses/:id", authenticateToken, (req: any, res: any) => {
  try {
    const course = db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新课程
app.put("/api/courses/:id", authenticateToken, requireTeacher, (req: any, res: any) => {
  try {
    const course = db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress !== req.user!.address) {
      return res.status(403).json({ error: "Not authorized to update this course" });
    }

    const updatedCourse = db.updateCourse(req.params.id!, req.body);
    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除课程
app.delete("/api/courses/:id", authenticateToken, requireTeacher, (req: any, res: any) => {
  try {
    const course = db.getCourse(req.params.id!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress !== req.user!.address) {
      return res.status(403).json({ error: "Not authorized to delete this course" });
    }

    const success = db.deleteCourse(req.params.id!);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 课次管理 API =====
// 创建课次
app.post("/api/courses/:courseId/sessions", authenticateToken, requireTeacher, (req: any, res: any) => {
  try {
    const { courseId } = req.params;
    const { name, description, startTime, endTime } = req.body;

    const course = db.getCourse(courseId!);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.teacherAddress !== req.user!.address) {
      return res.status(403).json({ error: "Not authorized to create sessions for this course" });
    }

    if (!name || typeof startTime !== "number" || typeof endTime !== "number" || endTime <= startTime) {
      return res.status(400).json({ error: "Invalid session data" });
    }

    const session = db.createSession({
      courseId: courseId!,
      name,
      description,
      startTime,
      endTime
    });

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课次列表
app.get("/api/courses/:courseId/sessions", authenticateToken, (req: any, res: any) => {
  try {
    const sessions = db.getSessionsByCourse(req.params.courseId!);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个课次
app.get("/api/sessions/:id", authenticateToken, (req: any, res: any) => {
  try {
    const session = db.getSession(req.params.id!);
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
const contractAddress = process.env.CONTRACT_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

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
    const { sessionId, tokenUri } = req.body;
    const studentAddress = req.user!.address;

    if (!ownerPk || !contractAddress) {
      return res.status(500).json({ error: "Server not configured" });
    }

    if (typeof sessionId !== "number" && typeof sessionId !== "string") {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    // 检查课次是否存在
    const session = db.getSession(sessionId.toString());
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // 检查是否已经签到
    const existingRecords = db.getAttendanceBySession(sessionId.toString());
    const alreadyCheckedIn = existingRecords.some((record: any) => 
      record.studentAddress.toLowerCase() === studentAddress.toLowerCase()
    );

    if (alreadyCheckedIn) {
      return res.status(400).json({ error: "Already checked in for this session" });
    }

    // 调用合约铸造NFT
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(ownerPk, provider);
    const contract = new ethers.Contract(contractAddress, attendanceAbi, wallet);
    
    const tx = await contract.mintAttendance!(
      BigInt(sessionId), 
      studentAddress, 
      tokenUri || "ipfs://metadata"
    );
    const receipt = await tx.wait();

    // 记录出勤
    const attendanceRecord = db.createAttendanceRecord({
      sessionId: sessionId.toString(),
      studentAddress,
      tokenId: receipt.logs?.[0]?.topics?.[3] || undefined,
      txHash: tx.hash,
      status: 'present'
    });

    res.json({ 
      hash: tx.hash, 
      status: receipt?.status,
      record: attendanceRecord
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取出勤记录
app.get("/api/attendance/records", authenticateToken, (req: any, res: any) => {
  try {
    const { sessionId, studentAddress } = req.query;
    
    let records: any[];
    if (sessionId) {
      records = db.getAttendanceBySession(sessionId as string);
    } else if (studentAddress) {
      records = db.getAttendanceByStudent(studentAddress as string);
    } else {
      // 根据用户角色返回相应记录
      if (req.user!.role === 'teacher') {
        // 教师可以看到所有记录（这里简化处理）
        records = [];
      } else {
        // 学生只能看到自己的记录
        records = db.getAttendanceByStudent(req.user!.address);
      }
    }

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取出勤统计
app.get("/api/attendance/stats/:sessionId", authenticateToken, (req: any, res: any ) => {
  try {
    const stats = db.getSessionStats(req.params.sessionId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课程出勤统计
app.get("/api/courses/:courseId/stats", authenticateToken, (req: any, res: any ) => {
  try {
    const stats = db.getCourseStats(req.params.courseId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


