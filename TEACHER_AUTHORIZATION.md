# 🎓 教师账号授权方法详解

## 📋 概述

本系统采用**区块链原生授权机制**，教师角色信息存储在智能合约中，确保去中心化和不可篡改。整个授权流程分为4个层次：

```
区块链合约层 → 授权脚本层 → 后端验证层 → 中间件保护层
```

---

## 🔗 1. 区块链合约层（RoleManager.sol）

### 核心功能

**位置**: `blockchain/contracts/RoleManager.sol`

### 关键数据结构

```solidity
// 角色枚举
enum Role { None, Teacher, Student }

// 地址到角色的映射（存储在区块链上）
mapping(address => Role) private _roles;

// 教师地址列表（用于遍历）
address[] private _teacherList;
```

### 授权函数

#### 1. `grantTeacherRole(address account)` - 单个授权
```solidity
function grantTeacherRole(address account) external onlyOwner nonReentrant {
    require(account != address(0), "Cannot grant role to zero address");
    require(_roles[account] != Role.Teacher, "Account already has teacher role");
    _grantTeacher(account);
}
```
- **权限**: 只有合约所有者（部署者）可以调用
- **功能**: 为指定地址授予教师角色
- **事件**: 触发 `RoleGranted` 事件

#### 2. `batchGrantTeacherRole(address[] accounts)` - 批量授权
```solidity
function batchGrantTeacherRole(address[] calldata accounts) external onlyOwner nonReentrant {
    for (uint256 i = 0; i < accounts.length; i++) {
        address account = accounts[i];
        if (account != address(0) && _roles[account] != Role.Teacher) {
            _grantTeacher(account);
        }
    }
}
```
- **权限**: 只有合约所有者可以调用
- **功能**: 批量为多个地址授予教师角色
- **优势**: 节省Gas费用（一次交易授权多个地址）

#### 3. `revokeTeacherRole(address account)` - 撤销授权
```solidity
function revokeTeacherRole(address account) external onlyOwner nonReentrant {
    require(_roles[account] == Role.Teacher, "Account does not have teacher role");
    _revokeTeacher(account);
}
```
- **权限**: 只有合约所有者可以调用
- **功能**: 撤销指定地址的教师角色

### 查询函数

#### `isTeacher(address account)` - 检查是否为教师
```solidity
function isTeacher(address account) external view returns (bool) {
    return _roles[account] == Role.Teacher;
}
```
- **用途**: 后端登录时查询用户角色
- **特点**: 只读函数，不消耗Gas

#### `isStudent(address account)` - 检查是否为学生
```solidity
function isStudent(address account) external view returns (bool) {
    return _roles[account] != Role.Teacher;  // 默认角色
}
```

---

## 📜 2. 授权脚本层（setup-teachers.ts）

### 脚本位置
`blockchain/scripts/setup-teachers.ts`

### 使用步骤

#### 步骤1: 设置环境变量
```bash
# 在 blockchain/.env 中设置已部署的 RoleManager 合约地址
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### 步骤2: 运行授权脚本
```bash
cd blockchain
npx hardhat run scripts/setup-teachers.ts --network localhost
```

### 脚本工作流程

```typescript
// 1. 获取签名者（合约所有者）
const [owner, teacher1, teacher2] = await ethers.getSigners();

// 2. 连接到已部署的 RoleManager 合约
const roleManager = new ethers.Contract(
    roleManagerAddress, 
    RoleManagerABI, 
    owner  // 使用合约所有者签名
);

// 3. 授权教师角色
const tx1 = await roleManager.grantTeacherRole(teacher1.address);
await tx1.wait();  // 等待交易确认

// 4. 验证授权结果
const isTeacher = await roleManager.isTeacher(teacher1.address);
console.log(`教师1是教师: ${isTeacher}`);  // true
```

### 授权示例输出

```
🎓 区块链课程出勤系统 - 教师角色管理

部署者地址: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
教师1地址: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
教师2地址: 0x90F79bf6EB2c4f870365E785982E1f101E93b906

📋 当前角色状态:
部署者: 1 (Teacher)
教师1: 0 (None)
教师2: 0 (None)

🔑 正在授权教师角色...
为教师1授权教师角色...
✅ 教师1已获得教师角色
为教师2授权教师角色...
✅ 教师2已获得教师角色

🔍 验证角色授权结果:
部署者: 1 (Teacher)
教师1: 1 (Teacher)  ✅
教师2: 1 (Teacher)  ✅

👨‍🏫 教师身份验证:
部署者是教师: true
教师1是教师: true
教师2是教师: true

🎉 教师角色设置完成！
```

---

## 🔐 3. 后端验证层（server.ts）

### 登录流程

**位置**: `backend/src/server.ts` - `/auth/login` 端点

### 完整流程

```typescript
app.post("/auth/login", async (req, res) => {
  // 步骤1: 验证钱包签名
  const { address, signature, message } = req.body;
  if (!verifySignature(address, signature, message)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // 步骤2: 从区块链查询角色
  const roleManagerAddress = process.env.CONTRACT_ADDRESS;
  const roleManagerContract = new ethers.Contract(
    roleManagerAddress,
    [
      "function isTeacher(address) view returns (bool)",
      "function isStudent(address) view returns (bool)"
    ],
    provider
  );

  // 步骤3: 查询区块链上的角色
  let role = 'student';  // 默认角色
  const isTeacherRole = await roleManagerContract.isTeacher(address);
  role = isTeacherRole ? 'teacher' : 'student';

  // 步骤4: 生成JWT Token（包含角色信息）
  const token = generateToken({ address, role, nonce: message });

  // 步骤5: 返回Token和用户信息
  res.json({
    token,
    user: { address, role },
    message: "Login successful"
  });
});
```

### 关键点

1. **签名验证**: 使用 `ethers.verifyMessage()` 验证钱包签名，确保地址真实性
2. **区块链查询**: 每次登录都从区块链查询最新角色，确保实时性
3. **JWT存储**: 角色信息存储在JWT token中，避免每次请求都查询区块链
4. **默认角色**: 如果查询失败，默认设置为 `student`

---

## 🛡️ 4. 中间件保护层（middleware.ts）

### 认证中间件

**位置**: `backend/src/middleware.ts`

#### `authenticateToken` - 基础认证
```typescript
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyToken(token);  // 验证JWT token
  if (!user) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;  // 将用户信息附加到请求对象
  next();
}
```

#### `requireTeacher` - 教师权限保护
```typescript
export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher role required' });
  }

  next();
}
```

### API路由保护示例

```typescript
// 只有教师可以访问的API
app.post("/api/courses", authenticateToken, requireTeacher, async (req, res) => {
  // 创建课程逻辑
});

app.post("/api/student-work/:id/endorse", authenticateToken, requireTeacher, async (req, res) => {
  // 认证学生作品逻辑
});
```

---

## 🔄 完整授权流程图

```
┌─────────────────────────────────────────────────────────────┐
│  1. 部署 RoleManager 合约                                      │
│     - 合约部署者自动获得教师角色                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  2. 运行授权脚本 (setup-teachers.ts)                          │
│     - 合约所有者调用 grantTeacherRole()                        │
│     - 教师地址记录在区块链上                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  3. 用户登录 (前端 → 后端 /auth/login)                         │
│     - 前端: 钱包签名验证                                        │
│     - 后端: 查询区块链 isTeacher(address)                       │
│     - 后端: 生成JWT token（包含角色）                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  4. API请求保护 (中间件)                                        │
│     - authenticateToken: 验证JWT token                          │
│     - requireTeacher: 检查角色是否为 'teacher'                 │
│     - 只有通过验证的教师才能访问受保护的API                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 关键特性

### ✅ 去中心化
- 角色信息存储在区块链上，不依赖中心化数据库
- 任何人都可以验证地址是否为教师（通过 `isTeacher()` 函数）

### ✅ 不可篡改
- 只有合约所有者可以修改教师角色
- 所有授权操作都会触发区块链事件，可追溯

### ✅ 实时性
- 每次登录都从区块链查询最新角色
- 即使区块链上角色变更，下次登录会自动更新

### ✅ 安全性
- 钱包签名验证确保地址真实性
- JWT token 确保API请求的完整性
- 中间件保护确保只有授权用户可以访问

---

## 📝 实际操作示例

### 🆕 如何新增教师角色（完整步骤指南）

本指南将详细说明如何为新的钱包地址授予教师角色。整个过程不需要修改代码，只需要运行脚本即可。

#### 前置条件检查

在开始之前，请确保：

1. ✅ **RoleManager 合约已部署**
   - 如果未部署，先运行 `npx hardhat run scripts/deploy.ts --network localhost`
   - 记录部署输出的 RoleManager 合约地址

2. ✅ **区块链网络正在运行**
   - 本地开发：`npx hardhat node` 应该在运行
   - 或连接到测试网/主网

3. ✅ **拥有合约所有者私钥**
   - 只有合约所有者（部署者）可以授权新教师
   - 确保你的钱包有足够的 Gas 费用

#### 方法一：使用 Hardhat Console（推荐 - 最简单）

这是最直接的方法，适合快速添加单个教师。

**步骤1: 打开 Hardhat Console**
```bash
cd blockchain
npx hardhat console --network localhost
```

**步骤2: 在 Console 中执行命令**

> **💡 重要提示**: 
> - 你可以**一行一行输入**，也可以**一次性粘贴多行代码**
> - 如果遇到 `Identifier 'xxx' has already been declared` 错误，说明变量已存在，可以：
>   - 使用不同的变量名（如 `owner2`, `roleManager2`）
>   - 或者重新打开 Console（输入 `.exit` 退出后重新进入）

**方式A: 分步执行（推荐，更清晰）**

在 Console 中**逐行输入**以下命令，每行按回车执行：

```javascript
// 第1步: 获取合约所有者（如果已存在 owner 变量，使用 owner2）
const [owner] = await ethers.getSigners();
await owner.getAddress();
```

```javascript
// 第2步: 设置合约地址（替换为你的实际地址）
const ROLE_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
```

```javascript
// 第3步: 定义合约 ABI
const RoleManagerABI = [
  "function grantTeacherRole(address account) external",
  "function isTeacher(address account) external view returns (bool)",
  "function getAllTeachers() external view returns (address[])"
];
```

```javascript
// 第4步: 连接到合约（如果已存在 roleManager，使用 roleManager2）
const roleManager = new ethers.Contract(ROLE_MANAGER_ADDRESS, RoleManagerABI, owner);
```

```javascript
// 第5步: 设置要授权的新教师地址（替换为实际地址）
const newTeacherAddress = "0x新教师的钱包地址";
```

```javascript
// 第6步: 检查是否已经是教师
await roleManager.isTeacher(newTeacherAddress);
```

```javascript
// 第7步: 执行授权（如果第6步返回 false）
const tx = await roleManager.grantTeacherRole(newTeacherAddress);
tx.hash;  // 查看交易哈希
```

```javascript
// 第8步: 等待交易确认
await tx.wait();
```

```javascript
// 第9步: 验证授权结果
await roleManager.isTeacher(newTeacherAddress);  // 应该返回 true
```

```javascript
// 第10步: 查看所有教师列表
await roleManager.getAllTeachers();
```

**方式B: 一次性粘贴（快速，但需注意变量冲突）**

如果变量未冲突，可以一次性粘贴以下完整代码：

```javascript
// 完整代码（一次性粘贴，注意替换地址）
(async () => {
  // 1. 获取合约所有者
  const [owner] = await ethers.getSigners();
  console.log("合约所有者地址:", await owner.getAddress());

  // 2. 连接到已部署的 RoleManager 合约
  const ROLE_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const RoleManagerABI = [
    "function grantTeacherRole(address account) external",
    "function isTeacher(address account) external view returns (bool)",
    "function getAllTeachers() external view returns (address[])"
  ];
  
  const roleManager = new ethers.Contract(
    ROLE_MANAGER_ADDRESS,
    RoleManagerABI,
    owner
  );

  // 3. 授权新教师（替换为新教师的钱包地址）
  const newTeacherAddress = "0x新教师的钱包地址";
  console.log("准备授权教师:", newTeacherAddress);

  // 检查是否已经是教师
  const isAlreadyTeacher = await roleManager.isTeacher(newTeacherAddress);
  if (isAlreadyTeacher) {
    console.log("⚠️ 该地址已经是教师，无需重复授权");
  } else {
    // 执行授权
    const tx = await roleManager.grantTeacherRole(newTeacherAddress);
    console.log("📤 交易已发送，哈希:", tx.hash);
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log("✅ 交易已确认，区块号:", receipt.blockNumber);
    
    // 验证授权结果
    const isTeacher = await roleManager.isTeacher(newTeacherAddress);
    console.log("✅ 授权验证:", isTeacher ? "成功" : "失败");
  }

  // 4. 查看所有教师列表
  const allTeachers = await roleManager.getAllTeachers();
  console.log("📋 当前所有教师地址:");
  allTeachers.forEach((addr, index) => {
    console.log(`   ${index + 1}. ${addr}`);
  });
})();
```

> **注意**: 使用 `(async () => { ... })()` 包装代码可以避免变量污染全局作用域，推荐使用这种方式。

**步骤3: 退出 Console**

```javascript
.exit
```

或者按 `Ctrl+C` 两次退出。

#### 方法二：创建临时授权脚本（适合批量授权）

如果你需要批量添加多个教师，可以创建一个临时脚本。

**步骤1: 创建临时脚本文件**

在 `blockchain/scripts/` 目录下创建 `grant-teacher.ts`：

```typescript
import { ethers } from "hardhat";

async function main() {
  // 配置：修改这些值
  const ROLE_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const NEW_TEACHER_ADDRESSES = [
    "0x新教师地址1",
    "0x新教师地址2",
    // 添加更多地址...
  ];

  const [owner] = await ethers.getSigners();
  console.log("合约所有者:", await owner.getAddress());

  const RoleManagerABI = [
    "function grantTeacherRole(address account) external",
    "function batchGrantTeacherRole(address[] calldata accounts) external",
    "function isTeacher(address account) external view returns (bool)",
    "function getAllTeachers() external view returns (address[])"
  ];

  const roleManager = new ethers.Contract(
    ROLE_MANAGER_ADDRESS,
    RoleManagerABI,
    owner
  );

  console.log("\n🔑 开始授权教师角色...\n");

  // 方法A: 单个授权（逐个处理）
  for (const address of NEW_TEACHER_ADDRESSES) {
    const isAlreadyTeacher = await roleManager.isTeacher(address);
    if (isAlreadyTeacher) {
      console.log(`⚠️  ${address} 已经是教师，跳过`);
      continue;
    }

    try {
      const tx = await roleManager.grantTeacherRole(address);
      console.log(`📤 授权 ${address}，交易哈希: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ ${address} 授权成功\n`);
    } catch (error: any) {
      console.error(`❌ ${address} 授权失败:`, error.message);
    }
  }

  // 方法B: 批量授权（更节省Gas，推荐）
  // 取消注释以下代码使用批量授权
  /*
  try {
    const tx = await roleManager.batchGrantTeacherRole(NEW_TEACHER_ADDRESSES);
    console.log(`📤 批量授权交易哈希: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ 批量授权成功\n`);
  } catch (error: any) {
    console.error(`❌ 批量授权失败:`, error.message);
  }
  */

  // 验证结果
  console.log("🔍 验证授权结果:");
  const allTeachers = await roleManager.getAllTeachers();
  console.log(`📋 当前共有 ${allTeachers.length} 位教师:`);
  allTeachers.forEach((addr: string, index: number) => {
    console.log(`   ${index + 1}. ${addr}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**步骤2: 修改脚本中的配置**

- 修改 `ROLE_MANAGER_ADDRESS` 为你的实际合约地址
- 修改 `NEW_TEACHER_ADDRESSES` 数组，添加要授权的地址

**步骤3: 运行脚本**

```bash
cd blockchain
npx hardhat run scripts/grant-teacher.ts --network localhost
```

#### 方法三：使用现有 setup-teachers.ts 脚本

如果你已经有 `setup-teachers.ts` 脚本，可以直接修改并运行。

**步骤1: 查看当前脚本**

```bash
cat blockchain/scripts/setup-teachers.ts
```

**步骤2: 修改脚本中的教师地址**

编辑 `blockchain/scripts/setup-teachers.ts`，在 `getSigners()` 后添加新教师地址，或直接调用 `grantTeacherRole()`。

**步骤3: 设置环境变量并运行**

```bash
cd blockchain
export CONTRACT_ADDRESS=0x你的RoleManager合约地址
npx hardhat run scripts/setup-teachers.ts --network localhost
```

#### 验证授权结果

无论使用哪种方法，授权完成后都应该验证：

**方法A: 在 Hardhat Console 中验证**
```javascript
const isTeacher = await roleManager.isTeacher("0x新教师地址");
console.log("是否为教师:", isTeacher);  // 应该返回 true
```

**方法B: 查看所有教师**
```javascript
const teachers = await roleManager.getAllTeachers();
console.log("所有教师:", teachers);
```

**方法C: 让新教师登录测试**
1. 新教师使用被授权的钱包地址登录系统
2. 系统会自动从区块链查询角色
3. 如果授权成功，登录后应该显示为 `teacher` 角色
4. 可以访问教师专属功能（如创建课程、批量铸造等）

#### 常见问题排查

**问题1: `Identifier 'owner' has already been declared`**
- **原因**: 在 Hardhat Console 中，变量 `owner` 或 `roleManager` 已经被声明过
- **解决**: 
  - **方法A**: 使用不同的变量名
    ```javascript
    const [owner2] = await ethers.getSigners();
    const roleManager2 = new ethers.Contract(...);
    ```
  - **方法B**: 退出并重新打开 Console
    ```javascript
    .exit  // 退出 Console
    // 然后重新运行: npx hardhat console --network localhost
    ```
  - **方法C**: 使用立即执行函数包装（推荐）
    ```javascript
    (async () => {
      const [owner] = await ethers.getSigners();
      // ... 其他代码
    })();
    ```

**问题2: 交易失败 - "only owner can call this function"**
- **原因**: 使用的签名者不是合约所有者
- **解决**: 确保使用部署合约时的账户（第一个账户）
  ```javascript
  // 检查当前使用的账户
  const [signer] = await ethers.getSigners();
  console.log("当前签名者:", await signer.getAddress());
  // 应该与部署合约时的地址一致
  ```

**问题3: 交易失败 - "Account already has teacher role"**
- **原因**: 该地址已经是教师
- **解决**: 无需重复授权，可以直接使用
  ```javascript
  // 先检查是否已经是教师
  const isTeacher = await roleManager.isTeacher("0x地址");
  if (isTeacher) {
    console.log("该地址已经是教师");
  }
  ```

**问题4: 授权成功但登录后仍显示为学生**
- **原因**: JWT token 中存储的是旧角色
- **解决**: 让用户退出登录后重新登录，系统会重新查询区块链
  - 前端：点击"退出登录"
  - 重新连接钱包并登录
  - 系统会从区块链重新查询 `isTeacher()` 函数

**问题5: 找不到合约地址**
- **原因**: 环境变量未设置或合约未部署
- **解决**: 
  ```bash
  # Windows PowerShell
  echo $env:CONTRACT_ADDRESS
  
  # Linux/macOS
  echo $CONTRACT_ADDRESS
  
  # 或重新部署合约获取地址
  npx hardhat run scripts/deploy.ts --network localhost
  ```

**问题6: Console 中代码执行没有反应**
- **原因**: 可能是异步操作没有等待完成
- **解决**: 
  - 确保使用 `await` 关键字
  - 或者使用 `(async () => { ... })()` 包装代码
  - 检查是否有语法错误（Console 会显示错误信息）

#### 完整操作示例（Windows PowerShell）

```powershell
# 1. 进入区块链目录
cd blockchain

# 2. 启动 Hardhat 节点（如果未运行）
# 新开一个终端窗口运行: npx hardhat node

# 3. 打开 Hardhat Console
npx hardhat console --network localhost

# 4. 在 Console 中执行（一行一行输入，或一次性粘贴）
# 注意：如果遇到变量已声明错误，使用不同的变量名或重新打开 Console

# 方式A: 分步执行（推荐）
const [owner] = await ethers.getSigners();
const roleManager = new ethers.Contract(
  "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ["function grantTeacherRole(address) external", "function isTeacher(address) view returns (bool)"],
  owner
);
const newTeacherAddress = "0x新教师地址";  // 替换为实际地址
const tx = await roleManager.grantTeacherRole(newTeacherAddress);
await tx.wait();
const isTeacher = await roleManager.isTeacher(newTeacherAddress);
console.log("授权成功:", isTeacher);

# 5. 退出 Console
.exit
```

**或者使用包装函数避免变量冲突：**

```javascript
// 在 Console 中一次性粘贴以下代码
(async () => {
  const [owner] = await ethers.getSigners();
  const roleManager = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    ["function grantTeacherRole(address) external", "function isTeacher(address) view returns (bool)"],
    owner
  );
  const newTeacherAddress = "0x新教师地址";  // 替换为实际地址
  const tx = await roleManager.grantTeacherRole(newTeacherAddress);
  await tx.wait();
  const isTeacher = await roleManager.isTeacher(newTeacherAddress);
  console.log("授权成功:", isTeacher);
})();
```

#### 完整操作示例（Linux/macOS）

```bash
# 1. 进入区块链目录
cd blockchain

# 2. 启动 Hardhat 节点（如果未运行）
# 新开一个终端窗口运行: npx hardhat node &

# 3. 打开 Hardhat Console
npx hardhat console --network localhost

# 4. 在 Console 中执行（一行一行输入，或一次性粘贴）
# 注意：如果遇到变量已声明错误，使用不同的变量名或重新打开 Console

# 方式A: 分步执行（推荐）
const [owner] = await ethers.getSigners();
const roleManager = new ethers.Contract(
  "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ["function grantTeacherRole(address) external", "function isTeacher(address) view returns (bool)"],
  owner
);
const newTeacherAddress = "0x新教师地址";  // 替换为实际地址
const tx = await roleManager.grantTeacherRole(newTeacherAddress);
await tx.wait();
const isTeacher = await roleManager.isTeacher(newTeacherAddress);
console.log("授权成功:", isTeacher);

# 5. 退出 Console
.exit
```

**或者使用包装函数避免变量冲突：**

```javascript
// 在 Console 中一次性粘贴以下代码
(async () => {
  const [owner] = await ethers.getSigners();
  const roleManager = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    ["function grantTeacherRole(address) external", "function isTeacher(address) view returns (bool)"],
    owner
  );
  const newTeacherAddress = "0x新教师地址";  // 替换为实际地址
  const tx = await roleManager.grantTeacherRole(newTeacherAddress);
  await tx.wait();
  const isTeacher = await roleManager.isTeacher(newTeacherAddress);
  console.log("授权成功:", isTeacher);
})();
```

> **💡 提示**: 
> - 在 Hardhat Console 中，你可以**逐行输入**命令，每行按回车执行
> - 也可以**一次性粘贴多行代码**，Console 会按顺序执行
> - 如果遇到 `Identifier 'xxx' has already been declared` 错误：
>   - 使用不同的变量名（如 `owner2`, `roleManager2`）
>   - 或者输入 `.exit` 退出后重新打开 Console
>   - 或者使用 `(async () => { ... })()` 包装代码，避免变量污染全局作用域

---

### 撤销教师权限

### 撤销教师权限

```typescript
// 在 setup-teachers.ts 中添加
const tx = await roleManager.revokeTeacherRole(teacherAddress);
await tx.wait();
console.log("✅ 教师权限已撤销");
```

---

## 🔍 调试技巧

### 检查教师角色

```typescript
// 在 Hardhat Console 中
const RoleManager = await ethers.getContractFactory("RoleManager");
const roleManager = RoleManager.attach("合约地址");
const isTeacher = await roleManager.isTeacher("0x教师地址");
console.log("是否为教师:", isTeacher);
```

### 查看所有教师

```typescript
const teachers = await roleManager.getAllTeachers();
console.log("所有教师地址:", teachers);
```

---

## 💡 总结

教师账号授权采用**区块链原生机制**：

1. **授权**: 合约所有者通过 `grantTeacherRole()` 在区块链上授权
2. **验证**: 后端登录时从区块链查询 `isTeacher(address)`
3. **存储**: 角色信息存储在JWT token中（避免频繁查询）
4. **保护**: 中间件 `requireTeacher` 确保API安全

这种设计确保了**去中心化**、**不可篡改**和**实时性**，体现了真正的区块链原生应用特性！🚀

