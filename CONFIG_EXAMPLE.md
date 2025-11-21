# 📋 配置文件示例

## 后端配置 (backend/.env)

创建 `backend/.env` 文件并填入以下内容：

```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/nft_attendance

# JWT安全密钥（生产环境请使用强密码）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 区块链合约地址（部署后填写）
ROLE_MANAGER_CONTRACT_ADDRESS=0x[部署时生成的地址]

# 开发环境设置
NODE_ENV=development
PORT=4000
```

## 前端配置 (frontend/.env.local)

编辑或创建 `frontend/.env.local` 文件：

```env
# 出勤NFT合约地址（固定地址）
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 区块链配置 (blockchain/.env)

创建 `blockchain/.env` 文件：

```env
# 本地开发配置
ROLE_MANAGER_CONTRACT_ADDRESS=0x[部署时生成的地址]

# 测试网配置（可选）
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your-private-key-without-0x-prefix
ETHERSCAN_API_KEY=your-etherscan-api-key
```

## 🔑 如何获取配置值

### 1. ROLE_MANAGER_CONTRACT_ADDRESS
运行部署脚本后会自动显示：
```
RoleManager deployed to: 0x1234567890123456789012345678901234567890
请将以下地址复制到 backend/.env:
ROLE_MANAGER_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### 2. JWT_SECRET
生成一个强密码：
```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(32, 4)
```

### 3. MongoDB_URI
- 本地安装：`mongodb://localhost:27017/nft_attendance`
- 云数据库：使用MongoDB Atlas连接字符串

## ✅ 配置检查

部署完成后，检查所有服务是否能正常启动：

```bash
# 1. 启动区块链网络
npx hardhat node

# 2. 启动后端
cd backend && npm run dev

# 3. 启动前端
cd frontend && npm run dev
```

如果都能正常启动，配置就是正确的！🎉
