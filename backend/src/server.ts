const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const path = require("path");
const { generateChallenge, verifySignature, generateToken, isTeacher } = require("./auth");
const { authenticateToken, requireTeacher, requireStudent } = require("./middleware");
const { db, connectDB } = require("./database");

// 明确指定 .env 文件路径
// 尝试多个可能的路径
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),           // 当前工作目录
  path.resolve(__dirname || process.cwd(), '../.env'),  // backend/.env (如果从 src 运行)
  path.resolve(process.cwd(), 'backend/.env'),   // 从项目根目录运行时的路径
];

let envPath: string | null = null;
let envResult: any = null;

for (const envFilePath of possiblePaths) {
  envResult = dotenv.config({ path: envFilePath });
  if (!envResult.error) {
    envPath = envFilePath;
    console.log(`✅ 已加载 .env 文件: ${envPath}`);
    break;
  }
}

if (!envPath) {
  console.warn(`⚠️ 无法从以下路径加载 .env 文件:`);
  possiblePaths.forEach(p => console.warn(`   - ${p}`));
  console.warn(`   尝试从默认位置加载...`);
  // 如果所有路径都失败，尝试默认路径
  envResult = dotenv.config();
  envPath = path.resolve(process.cwd(), '.env');
}

// 检查关键环境变量
function checkEnvironmentVariables() {
  const requiredVars: string[] = [];
  const recommendedVars: string[] = ['STUDENT_PET_CONTRACT_ADDRESS'];
  
  // 检查必需的环境变量
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ 必需的环境变量 ${varName} 未设置`);
      process.exit(1);
    }
  }
  
  // 检查推荐的环境变量
  for (const varName of recommendedVars) {
    if (!process.env[varName]) {
      console.warn(`⚠️  推荐的环境变量 ${varName} 未设置`);
      console.warn(`   宠物经验值功能将无法使用，请检查部署输出文件并设置环境变量`);
      console.warn(`   正确的值应该是: STUDENT_PET_CONTRACT_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F`);
      console.warn(`   .env 文件路径: ${envPath}`);
    } else {
      const value = process.env[varName];
      console.log(`✅ ${varName} = ${value}`);
      
      // 验证是否是错误的 RoleManager 地址
      const roleManagerAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      if (value.toLowerCase() === roleManagerAddress.toLowerCase()) {
        console.error(`❌ 错误：${varName} 被设置为 RoleManager 合约地址！`);
        console.error(`   当前读取的值: ${value}`);
        console.error(`   RoleManager 地址: ${roleManagerAddress}`);
        console.error(`   请设置为 StudentPetNFT 合约地址: 0x0165878A594ca255338adfa4d48449f69242Eb8F`);
        console.error(`   .env 文件路径: ${envPath || '未知'}`);
        console.error(`   请检查 ${envPath || 'backend/.env'} 文件中的 ${varName} 值是否正确`);
        console.error(`   提示：确保文件中是 STUDENT_PET_CONTRACT_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F`);
        console.error(`   而不是 STUDENT_PET_CONTRACT_ADDRESS=${value}`);
        
        // 检查是否有系统环境变量覆盖
        if (process.env[varName] && process.env[varName] !== value) {
          console.error(`   ⚠️ 检测到系统环境变量可能覆盖了 .env 文件的值`);
        }
      }
      
      // 验证地址格式
      if (!ethers.isAddress(value)) {
        console.error(`❌ ${varName} 格式无效: ${value}`);
      }
    }
  }
}

// 在启动时检查环境变量
checkEnvironmentVariables();

// 数据库连接
connectDB().then(() => {
  console.log('✅ Database connected successfully');

  // 启动区块链事件监听
  startBlockchainListener();
}).catch((error: any) => {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
});

// 全局 Provider 实例
let globalProvider: any = null;
let globalSigner: any = null;

function getProvider() {
  if (!globalProvider) {
    globalProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  }
  return globalProvider;
}

function getSigner() {
  if (!globalSigner) {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const ownerPk = process.env.OWNER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const provider = getProvider();
    globalSigner = new ethers.Wallet(ownerPk, provider);
  }
  return globalSigner;
}

// StudentPetNFT 合约实例
let studentPetContract: any = null;

function getStudentPetContract() {
  if (!studentPetContract) {
    const contractAddress = process.env.STUDENT_PET_CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.warn('⚠️ STUDENT_PET_CONTRACT_ADDRESS not set, pet functions will use database only');
      return null;
    }
    
    // 验证合约地址格式
    if (!ethers.isAddress(contractAddress)) {
      console.error(`❌ STUDENT_PET_CONTRACT_ADDRESS 格式无效: ${contractAddress}`);
      return null;
    }
    
    // 检查是否错误地使用了 RoleManager 合约地址
    const roleManagerAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    if (contractAddress.toLowerCase() === roleManagerAddress.toLowerCase()) {
      console.error(`❌ 错误：STUDENT_PET_CONTRACT_ADDRESS 被设置为 RoleManager 合约地址！`);
      console.error(`   当前值: ${contractAddress}`);
      console.error(`   请设置为 StudentPetNFT 合约地址: 0x0165878A594ca255338adfa4d48449f69242Eb8F`);
      return null;
    }
    
    const signer = getSigner();
    const abi = [
      "function mintPet(address student) external returns (uint256)",
      "function getOrCreatePetTokenId(address student) external returns (uint256)",
      "function addExperience(address studentAddress, uint256 amount) external",
      "function getPetInfo(address studentAddress) external view returns (uint256 tokenId, uint8 stage, uint256 experience)",
      "function studentToTokenId(address) external view returns (uint256)"
    ];
    
    console.log(`✅ 初始化 StudentPetNFT 合约实例，地址: ${contractAddress}`);
    studentPetContract = new ethers.Contract(contractAddress, abi, signer);
  }
  return studentPetContract;
}

// 辅助函数：更新学生宠物的经验值（链上）
async function addPetExperienceOnChain(studentAddress: string, amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> {
  try {
    const contract = getStudentPetContract();
    if (!contract) {
      const errorMsg = '⚠️ StudentPetNFT contract not available. Please check STUDENT_PET_CONTRACT_ADDRESS environment variable.';
      console.warn(errorMsg);
      return { success: false, error: errorMsg };
    }

    // 确保学生有宠物，如果没有则自动创建
    try {
    const tokenId = await contract.studentToTokenId(studentAddress);
    if (tokenId === 0n) {
      console.log(`📦 为学生 ${studentAddress} 自动创建宠物...`);
        const createTx = await contract.getOrCreatePetTokenId(studentAddress);
        console.log(`📤 宠物创建交易: ${createTx.hash}`);
        await createTx.wait();
        console.log(`✅ 宠物创建成功`);
      }
    } catch (createError: any) {
      const errorMsg = `创建宠物失败: ${createError.message}`;
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // 添加经验值
    try {
    const tx = await contract.addExperience(studentAddress, amount);
    console.log(`📤 发送经验值更新交易: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ 学生 ${studentAddress} 获得 ${amount} XP (链上), 交易确认在区块 ${receipt.blockNumber}`);
      return { success: true, txHash: tx.hash };
    } catch (txError: any) {
      const errorMsg = `经验值更新交易失败: ${txError.message}`;
      console.error(`❌ ${errorMsg}`);
      // 检查是否是权限问题
      if (txError.message.includes('revert') || txError.message.includes('unauthorized')) {
        console.error(`   可能是权限问题，请检查合约所有者配置`);
      }
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    const errorMsg = `链上更新经验值失败: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    console.error(`   错误详情:`, error);
    return { success: false, error: errorMsg };
  }
}

// 辅助函数：从链上获取宠物信息
async function getPetInfoFromChain(studentAddress: string) {
  try {
    const contract = getStudentPetContract();
    if (!contract) {
      console.warn(`⚠️ 无法获取 StudentPetNFT 合约实例，跳过链上查询`);
      return null;
    }

    const contractAddress = contract.target;
    console.log(`🔍 从链上获取宠物信息，学生地址: ${studentAddress}, 合约地址: ${contractAddress}`);

    const [tokenId, stage, experience] = await contract.getPetInfo(studentAddress);
    
    const result = {
      tokenId: tokenId.toString(),
      stage: Number(stage),
      experience: Number(experience)
    };
    
    console.log(`✅ 成功获取宠物信息:`, result);
    return result;
  } catch (error: any) {
    const contract = getStudentPetContract();
    const contractAddress = contract ? contract.target : 'unknown';
    
    console.error(`❌ 从链上获取宠物信息失败:`);
    console.error(`   学生地址: ${studentAddress}`);
    console.error(`   合约地址: ${contractAddress}`);
    console.error(`   错误信息: ${error.message}`);
    
    // 检查是否是合约地址错误
    if (error.message.includes('execution reverted') || error.message.includes('no data present')) {
      console.error(`   ⚠️ 可能是合约地址配置错误，请检查 STUDENT_PET_CONTRACT_ADDRESS 环境变量`);
      console.error(`   正确的 StudentPetNFT 合约地址应该是: 0x0165878A594ca255338adfa4d48449f69242Eb8F`);
      console.error(`   当前配置的地址: ${contractAddress}`);
      
      // 检查是否错误地使用了 RoleManager 地址
      const roleManagerAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      if (contractAddress.toLowerCase() === roleManagerAddress.toLowerCase()) {
        console.error(`   ❌ 确认：当前使用的是 RoleManager 合约地址，这是错误的！`);
        console.error(`   请将 STUDENT_PET_CONTRACT_ADDRESS 设置为 StudentPetNFT 合约地址`);
      }
    }
    
    return null;
  }
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

        // 给学生宠物增加经验值 (+5 XP) - 链上更新
        try {
          console.log(`🎁 开始为学生 ${student} 增加出勤奖励经验值 (+5 XP)...`);
          const experienceResult = await addPetExperienceOnChain(student, 5);
          
          if (experienceResult.success) {
            console.log(`✅ 经验值更新成功，交易哈希: ${experienceResult.txHash}`);
            
          // 同时更新数据库（用于快速查询）
            try {
          const petInfo = await getPetInfoFromChain(student);
              if (petInfo && petInfo.tokenId !== "0") {
            await db.createOrUpdateStudentPet(student, {
              stage: petInfo.stage,
              experience: petInfo.experience,
              tokenId: petInfo.tokenId
            });
                console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}`);
              } else {
                console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
              }
            } catch (dbError: any) {
              console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
            }
          } else {
            console.error(`❌ 经验值更新失败: ${experienceResult.error}`);
            console.error(`   出勤记录已保存，但学生未获得经验值奖励`);
          }
        } catch (petError: any) {
          console.error('❌ 宠物经验值更新过程中发生异常:', petError);
          // 不影响出勤记录的主流程
        }

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

    if (retryCount < 5) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`⏳ ${delay / 1000}秒后重试...`);
      setTimeout(() => startBlockchainListener(retryCount + 1), delay);
    } else {
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
    const provider = getProvider();
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
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
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

// 同步指定课次的出勤记录（从区块链查询历史事件）
app.post("/api/attendance/sync-session/:sessionId", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // 获取session信息
    const session = await db.getSession(sessionId);
    if (!session || !session.globalSessionId) {
      return res.status(404).json({ error: 'Session not found or missing globalSessionId' });
    }

    const provider = getProvider();
    const contractAddress = process.env.VITE_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    
    // 创建合约实例
    const contract = new ethers.Contract(
      contractAddress,
      [
        "event AttendanceRecorded(uint256 indexed sessionId, address indexed student, uint256 tokenId)",
        "function hasAttended(uint256 sessionId, address student) view returns (bool)"
      ],
      provider
    );

    // 查询该sessionId的所有AttendanceRecorded事件
    const filter = contract.filters.AttendanceRecorded(session.globalSessionId, null, null);
    const events = await contract.queryFilter(filter);

    console.log(`📋 找到 ${events.length} 个出勤记录事件 (Session ID: ${session.globalSessionId})`);

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const contractSessionId = event.args[0];
        const student = event.args[1];
        const tokenId = event.args[2];
        const txHash = event.transactionHash;

        // 检查数据库中是否已有记录
        const existingRecord = await db.getAttendanceRecordByStudentAndSession(student, sessionId);
        if (existingRecord) {
          skippedCount++;
          continue;
        }

        // 保存到数据库
        await db.createAttendanceRecord({
          sessionId: sessionId,
          studentAddress: student,
          tokenId: tokenId.toString(),
          txHash: txHash,
          status: 'present'
        });

        syncedCount++;

        // 给学生宠物增加经验值（如果还没有增加过）
        try {
          console.log(`🎁 开始为学生 ${student} 增加出勤奖励经验值 (+5 XP)...`);
          const experienceResult = await addPetExperienceOnChain(student, 5);
          
          if (experienceResult.success) {
            console.log(`✅ 经验值更新成功，交易哈希: ${experienceResult.txHash}`);
            
            // 同时更新数据库（用于快速查询）
            try {
          const petInfo = await getPetInfoFromChain(student);
              if (petInfo && petInfo.tokenId !== "0") {
            await db.createOrUpdateStudentPet(student, {
              stage: petInfo.stage,
              experience: petInfo.experience,
              tokenId: petInfo.tokenId
            });
                console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}`);
              } else {
                console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
              }
            } catch (dbError: any) {
              console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
            }
          } else {
            console.error(`❌ 经验值更新失败 (${student}): ${experienceResult.error}`);
            errors.push(`学生 ${student} 经验值更新失败: ${experienceResult.error}`);
          }
        } catch (petError: any) {
          console.error(`❌ 宠物经验值更新过程中发生异常 (${student}):`, petError);
          errors.push(`学生 ${student} 经验值更新异常: ${petError.message}`);
        }

      } catch (error: any) {
        errors.push(`处理事件失败: ${error.message}`);
        console.error('处理事件失败:', error);
      }
    }

    res.json({
      success: true,
      message: `同步完成`,
      sessionId: sessionId,
      globalSessionId: session.globalSessionId,
      totalEvents: events.length,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('同步出勤记录失败:', error);
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
app.get("/api/attendance/stats/:sessionId", authenticateToken, async (req: any, res: any) => {
  try {
    const stats = await db.getSessionStats(req.params.sessionId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取课程出勤统计
app.get("/api/courses/:courseId/stats", authenticateToken, async (req: any, res: any) => {
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

// ===== Advanced Features APIs =====

// 1. Certificates (SBT)
app.post("/api/certificates", authenticateToken, requireTeacher, async (req: any, res: any) => {
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

    // 如果证书创建成功，给学生宠物增加经验值 (+50 XP) - 链上更新
    let experienceUpdateResult = null;
    try {
      console.log(`🎁 开始为学生 ${studentAddress} 增加证书奖励经验值 (+50 XP)...`);
      experienceUpdateResult = await addPetExperienceOnChain(studentAddress, 50);
      
      if (experienceUpdateResult.success) {
        console.log(`✅ 经验值更新成功，交易哈希: ${experienceUpdateResult.txHash}`);
        
      // 同时更新数据库（用于快速查询）
        try {
      const petInfo = await getPetInfoFromChain(studentAddress);
          if (petInfo && petInfo.tokenId !== "0") {
        await db.createOrUpdateStudentPet(studentAddress, {
          stage: petInfo.stage,
          experience: petInfo.experience,
          tokenId: petInfo.tokenId
        });
            console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}, 阶段: ${petInfo.stage}`);
          } else {
            console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
          }
        } catch (dbError: any) {
          console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
          // 链上更新已成功，数据库同步失败不影响主流程
        }
      } else {
        // 经验值更新失败
        console.error(`❌ 经验值更新失败: ${experienceUpdateResult.error}`);
        console.error(`   证书已创建，但学生未获得经验值奖励`);
        // 不影响颁发证书的主流程，但记录错误
      }
    } catch (petError: any) {
      console.error('❌ 宠物经验值更新过程中发生异常:', petError);
      console.error('   错误详情:', petError);
      // 不影响颁发证书的主流程
    }

    console.log('证书创建成功:', cert);
    
    // 返回证书信息，同时包含经验值更新状态
    const response: any = { ...cert };
    if (experienceUpdateResult) {
      response.experienceUpdate = {
        success: experienceUpdateResult.success,
        error: experienceUpdateResult.error,
        txHash: experienceUpdateResult.txHash
      };
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('证书创建失败:', error);
    res.status(500).json({ error: `证书创建失败: ${error.message}` });
  }
});

app.get("/api/certificates", authenticateToken, async (req: any, res: any) => {
  try {
    const studentAddress = req.query.studentAddress || req.user!.address;
    const certs = await db.getCertificatesByStudent(studentAddress as string);
    res.json(certs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Student Work (IP)
app.post("/api/student-work", authenticateToken, requireStudent, async (req: any, res: any) => {
  try {
    const { title, description, fileUrl, tokenId, txHash } = req.body;
    const work = await db.createStudentWork({
      studentAddress: req.user!.address,
      title,
      description,
      fileUrl,
      tokenId,
      txHash
    });

    // 如果作品创建成功，给学生宠物增加经验值 (+10 XP) - 链上更新
    let experienceUpdateResult = null;
    try {
      console.log(`🎁 开始为学生 ${req.user!.address} 增加作品奖励经验值 (+10 XP)...`);
      experienceUpdateResult = await addPetExperienceOnChain(req.user!.address, 10);
      
      if (experienceUpdateResult.success) {
        console.log(`✅ 经验值更新成功，交易哈希: ${experienceUpdateResult.txHash}`);
        
      // 同时更新数据库（用于快速查询）
        try {
      const petInfo = await getPetInfoFromChain(req.user!.address);
          if (petInfo && petInfo.tokenId !== "0") {
        await db.createOrUpdateStudentPet(req.user!.address, {
          stage: petInfo.stage,
          experience: petInfo.experience,
          tokenId: petInfo.tokenId
        });
            console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}`);
          } else {
            console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
          }
        } catch (dbError: any) {
          console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
        }
      } else {
        console.error(`❌ 经验值更新失败: ${experienceUpdateResult.error}`);
        console.error(`   作品已创建，但学生未获得经验值奖励`);
      }
    } catch (petError: any) {
      console.error('❌ 宠物经验值更新过程中发生异常:', petError);
      // 不影响铸造作品的主流程
    }

    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/student-work", authenticateToken, async (req: any, res: any) => {
  try {
    const studentAddress = req.query.studentAddress as string;
    const works = await db.getStudentWorks(studentAddress);
    res.json(works);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/student-work/:id/endorse", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    // 先认证作品
    const work = await db.endorseStudentWork(req.params.id!);

    // 如果认证成功，给学生宠物增加经验值 (+30 XP) - 链上更新
    if (work && work.studentAddress) {
      try {
        console.log(`🎁 开始为学生 ${work.studentAddress} 增加作品认证奖励经验值 (+30 XP)...`);
        const experienceResult = await addPetExperienceOnChain(work.studentAddress, 30);
        
        if (experienceResult.success) {
          console.log(`✅ 经验值更新成功，交易哈希: ${experienceResult.txHash}`);
          
        // 同时更新数据库（用于快速查询）
          try {
        const petInfo = await getPetInfoFromChain(work.studentAddress);
            if (petInfo && petInfo.tokenId !== "0") {
          await db.createOrUpdateStudentPet(work.studentAddress, {
            stage: petInfo.stage,
            experience: petInfo.experience,
            tokenId: petInfo.tokenId
          });
              console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}`);
            } else {
              console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
            }
          } catch (dbError: any) {
            console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
          }
        } else {
          console.error(`❌ 经验值更新失败: ${experienceResult.error}`);
          console.error(`   作品已认证，但学生未获得经验值奖励`);
        }
      } catch (petError: any) {
        console.error('❌ 宠物经验值更新过程中发生异常:', petError);
        // 不影响认证作品的主流程
      }
    }

    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Access Pass
app.post("/api/access-pass", authenticateToken, requireTeacher, async (req: any, res: any) => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/access-pass", authenticateToken, async (req: any, res: any) => {
  try {
    const studentAddress = req.query.studentAddress || req.user!.address;
    const passes = await db.getAccessPasses(studentAddress as string);
    res.json(passes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access-pass/:id/redeem", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log('收到通行证兑换请求，通行证ID:', id, '用户:', req.user?.address);

    // 首先获取通行证信息，确认所有权
    const passes = await db.getAccessPasses(req.user!.address);
    const pass = passes.find((p: any) => p._id === id);

    if (!pass) {
      return res.status(404).json({ error: '通行证不存在或不属于当前用户' });
    }

    if (pass.isRedeemed) {
      return res.status(400).json({ error: '通行证已被兑换' });
    }

    // 兑换通行证
    const updatedPass = await db.redeemAccessPass(id);
    console.log('通行证兑换成功:', updatedPass);

    // 如果兑换成功，给学生宠物增加经验值 (+20 XP) - 链上更新
    try {
      console.log(`🎁 开始为学生 ${req.user!.address} 增加通行证兑换奖励经验值 (+20 XP)...`);
      const experienceResult = await addPetExperienceOnChain(req.user!.address, 20);
      
      if (experienceResult.success) {
        console.log(`✅ 经验值更新成功，交易哈希: ${experienceResult.txHash}`);
        
      // 同时更新数据库（用于快速查询）
        try {
      const petInfo = await getPetInfoFromChain(req.user!.address);
          if (petInfo && petInfo.tokenId !== "0") {
        await db.createOrUpdateStudentPet(req.user!.address, {
          stage: petInfo.stage,
          experience: petInfo.experience,
          tokenId: petInfo.tokenId
        });
            console.log(`✅ 数据库同步成功，当前经验值: ${petInfo.experience}`);
          } else {
            console.warn(`⚠️ 无法从链上获取宠物信息，数据库未更新`);
          }
        } catch (dbError: any) {
          console.warn(`⚠️ 数据库同步失败（链上更新已成功）:`, dbError.message);
        }
      } else {
        console.error(`❌ 经验值更新失败: ${experienceResult.error}`);
        console.error(`   通行证已兑换，但学生未获得经验值奖励`);
      }
    } catch (petError: any) {
      console.error('❌ 宠物经验值更新过程中发生异常:', petError);
      // 不影响兑换通行证的主流程
    }

    res.json(updatedPass);
  } catch (error: any) {
    console.error('通行证兑换失败:', error);
    res.status(500).json({ error: `通行证兑换失败: ${error.message}` });
  }
});

// 4. Student Pet (Dynamic NFT) - 完全去中心化
app.get("/api/student-pet", authenticateToken, async (req: any, res: any) => {
  try {
    const studentAddress = req.query.studentAddress || req.user!.address;
    
    // 优先从链上读取（真实数据源）
    const petInfo = await getPetInfoFromChain(studentAddress as string);
    
    if (petInfo && petInfo.tokenId !== "0") {
      // 有链上数据，返回链上数据
      res.json({
        stage: petInfo.stage,
        experience: petInfo.experience,
        tokenId: petInfo.tokenId
      });
    } else {
      // 没有链上数据，尝试从数据库读取（兼容旧数据）
      const pet = await db.getStudentPet(studentAddress as string);
      res.json(pet || { stage: 0, experience: 0, tokenId: null });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/student-pet/update", authenticateToken, requireTeacher, async (req: any, res: any) => {
  try {
    const { studentAddress, stage, experience, tokenId } = req.body;
    const pet = await db.createOrUpdateStudentPet(studentAddress, {
      stage,
      experience,
      tokenId
    });
    res.json(pet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Gallery APIs - 作品画廊
app.get("/api/gallery", authenticateToken, async (req: any, res: any) => {
  try {
    const works = await db.getGalleryWorks();
    res.json(works);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 点赞作品
app.post("/api/student-work/:id/like", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userAddress = req.user!.address;

    // 检查是否已经点赞
    const hasLiked = await db.hasLiked(id, userAddress);
    if (hasLiked) {
      return res.status(400).json({ error: '已经点赞过了' });
    }

    const like = await db.addLike(id, userAddress);
    const likesCount = await db.getLikesCount(id);

    res.json({ like, likesCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取消点赞
app.delete("/api/student-work/:id/like", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userAddress = req.user!.address;

    const removedLike = await db.removeLike(id, userAddress);
    const likesCount = await db.getLikesCount(id);

    res.json({ removed: !!removedLike, likesCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 检查是否已点赞
app.get("/api/student-work/:id/like", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userAddress = req.user!.address;

    const hasLiked = await db.hasLiked(id, userAddress);
    const likesCount = await db.getLikesCount(id);

    res.json({ hasLiked, likesCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加评论
app.post("/api/student-work/:id/comment", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userAddress = req.user!.address;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    const comment = await db.addComment(id, userAddress, content.trim());
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取作品评论
app.get("/api/student-work/:id/comments", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const comments = await db.getComments(id);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POAP Synthesis (Placeholder for logic)
app.post("/api/poap/synthesize", authenticateToken, requireStudent, async (req: any, res: any) => {
  // In a real implementation, this might check eligibility or record the synthesis event
  // For now, we assume the synthesis happens on-chain and we just record it if needed
  res.json({ message: "Synthesis logic to be implemented" });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


