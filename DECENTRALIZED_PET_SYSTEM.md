# 🌱 完全去中心化的学习宠物系统

## 📋 概述

学习宠物系统现已实现**完全去中心化**，所有经验值和阶段数据都存储在区块链智能合约中，而不是仅存储在数据库中。这确保了数据的不可篡改性和真正的去中心化特性。

---

## 🎯 核心改进

### 之前（中心化）
- ❌ 经验值和阶段存储在 MongoDB 数据库
- ❌ 数据可以被后端修改
- ❌ 不透明，无法验证

### 现在（去中心化）
- ✅ 经验值和阶段存储在区块链智能合约
- ✅ 数据不可篡改，完全透明
- ✅ 任何人都可以验证学生的经验值和阶段
- ✅ 自动升级机制（根据经验值自动计算阶段）

---

## 📝 合约功能

### StudentPetNFT.sol 新增功能

#### 1. 经验值存储
```solidity
mapping(uint256 => uint256) public petExperience;  // tokenId => 经验值
```

#### 2. 学生到 TokenId 映射
```solidity
mapping(address => uint256) public studentToTokenId;  // 一个学生一个宠物
```

#### 3. 自动升级机制
```solidity
function addExperience(address studentAddress, uint256 amount) external onlyOwner {
    // 自动根据经验值计算阶段
    // 0-99 XP: Seed (种子) 🌱
    // 100-199 XP: Sprout (幼苗) 🌿
    // 200+ XP: Flower (花朵) 🌸
}
```

#### 4. 查询函数
```solidity
function getPetInfo(address studentAddress) external view returns (
    uint256 tokenId,
    Stage stage,
    uint256 experience
)
```

---

## 🔧 配置步骤

### 1. 部署合约

```bash
cd blockchain
npx hardhat run scripts/deploy_advanced.ts --network localhost
```

部署后会显示：
```
StudentPetNFT deployed to: 0x1234567890123456789012345678901234567890
```

### 2. 配置后端环境变量

在 `backend/.env` 中添加：

```env
# StudentPetNFT 合约地址（完全去中心化）
STUDENT_PET_CONTRACT_ADDRESS=0x[部署时生成的地址]

# 合约所有者的私钥（用于签名交易）
OWNER_PRIVATE_KEY=0x[你的私钥]

# RPC URL（本地开发）
RPC_URL=http://127.0.0.1:8545
```

### 3. 重新编译后端

```bash
cd backend
npm run build
```

### 4. 重启后端服务

```bash
npm run dev
```

---

## 🚀 工作流程

### 学生获得经验值的完整流程

```
1. 学生完成活动（出勤、提交作品、获得证书等）
   ↓
2. 后端调用 addPetExperienceOnChain(studentAddress, amount)
   ↓
3. 合约自动检查学生是否有宠物，没有则自动创建
   ↓
4. 合约增加经验值：petExperience[tokenId] += amount
   ↓
5. 合约自动计算新阶段：_calculateStage(experience)
   ↓
6. 如果阶段升级，触发 PetEvolved 事件
   ↓
7. 后端同步更新数据库（用于快速查询）
   ↓
8. 前端从链上读取最新数据
```

### 经验值奖励规则

| 活动 | 经验值奖励 |
|------|-----------|
| 出勤记录 | +5 XP |
| 铸造作品 | +10 XP |
| 作品被认证 | +30 XP |
| 兑换通行证 | +20 XP |
| 获得证书 | +50 XP |

### 阶段升级规则

| 经验值范围 | 阶段 | 图标 |
|-----------|------|------|
| 0-99 XP | Seed (种子) | 🌱 |
| 100-199 XP | Sprout (幼苗) | 🌿 |
| 200+ XP | Flower (花朵) | 🌸 |

---

## 📡 API 端点

### GET /api/student-pet

获取学生的宠物信息（优先从链上读取）

**请求**:
```bash
GET /api/student-pet?studentAddress=0x...
```

**响应**:
```json
{
  "stage": 1,
  "experience": 150,
  "tokenId": "123"
}
```

**特点**:
- 优先从区块链合约读取（真实数据源）
- 如果没有链上数据，回退到数据库（兼容旧数据）

---

## 🔍 验证去中心化

### 在 Hardhat Console 中验证

```javascript
// 1. 连接到合约
const StudentPetNFT = await ethers.getContractFactory("StudentPetNFT");
const petContract = StudentPetNFT.attach("0x合约地址");

// 2. 查询学生宠物信息
const [tokenId, stage, experience] = await petContract.getPetInfo("0x学生地址");
console.log("Token ID:", tokenId.toString());
console.log("Stage:", stage);  // 0=Seed, 1=Sprout, 2=Flower
console.log("Experience:", experience.toString());

// 3. 验证经验值
const exp = await petContract.petExperience(tokenId);
console.log("链上经验值:", exp.toString());
```

### 在 Etherscan 上验证

1. 访问合约地址
2. 查看 `petExperience` mapping
3. 查看 `petStages` mapping
4. 查看 `ExperienceAdded` 和 `PetEvolved` 事件

---

## 🛠️ 后端实现细节

### 合约连接函数

```typescript
function getStudentPetContract() {
  // 创建合约实例
  const contract = new ethers.Contract(
    process.env.STUDENT_PET_CONTRACT_ADDRESS,
    abi,
    signer
  );
  return contract;
}
```

### 添加经验值函数

```typescript
async function addPetExperienceOnChain(studentAddress: string, amount: number) {
  const contract = getStudentPetContract();
  
  // 确保学生有宠物
  const tokenId = await contract.studentToTokenId(studentAddress);
  if (tokenId === 0n) {
    await contract.getOrCreatePetTokenId(studentAddress);
  }
  
  // 添加经验值（自动升级）
  const tx = await contract.addExperience(studentAddress, amount);
  await tx.wait();
}
```

### 读取宠物信息函数

```typescript
async function getPetInfoFromChain(studentAddress: string) {
  const contract = getStudentPetContract();
  const [tokenId, stage, experience] = await contract.getPetInfo(studentAddress);
  return {
    tokenId: tokenId.toString(),
    stage: Number(stage),
    experience: Number(experience)
  };
}
```

---

## ⚠️ 注意事项

### 1. Gas 费用

每次添加经验值都需要消耗 Gas：
- 本地开发：免费（使用 Hardhat 本地网络）
- 测试网/主网：需要支付 Gas 费用

### 2. 交易确认时间

- 本地网络：几乎即时
- 测试网：几秒到几分钟
- 主网：取决于网络拥堵情况

### 3. 数据库同步

后端会同时更新数据库，用于：
- 快速查询（避免每次查询区块链）
- 兼容旧数据
- 降级处理（如果合约不可用）

### 4. 合约所有者权限

只有合约所有者可以：
- 铸造新宠物
- 添加经验值
- 更新阶段

确保 `OWNER_PRIVATE_KEY` 环境变量设置正确。

---

## 🐛 故障排查

### 问题1: "StudentPetNFT contract not available"

**原因**: `STUDENT_PET_CONTRACT_ADDRESS` 环境变量未设置

**解决**: 
```bash
# 在 backend/.env 中添加
STUDENT_PET_CONTRACT_ADDRESS=0x你的合约地址
```

### 问题2: "Student does not have a pet"

**原因**: 学生还没有宠物 NFT

**解决**: 系统会自动创建，但需要确保合约所有者有权限

### 问题3: 交易失败

**原因**: Gas 不足或网络问题

**解决**: 
- 检查 `OWNER_PRIVATE_KEY` 是否正确
- 确保账户有足够的 ETH（测试网/主网）
- 检查 RPC URL 是否可访问

### 问题4: 数据不一致

**原因**: 数据库和链上数据不同步

**解决**: 
- 重新同步：调用 `getPetInfoFromChain()` 更新数据库
- 或者清除数据库，完全依赖链上数据

---

## 📊 数据对比

### 链上数据（真实数据源）
- ✅ 不可篡改
- ✅ 完全透明
- ✅ 可验证
- ⚠️ 需要 Gas 费用
- ⚠️ 查询较慢

### 数据库数据（缓存）
- ✅ 查询快速
- ✅ 免费
- ❌ 可被修改
- ❌ 不透明

**最佳实践**: 链上存储，数据库缓存

---

## 🎉 优势总结

1. **真正的去中心化**: 数据存储在区块链上，不依赖中心化服务器
2. **不可篡改**: 一旦写入区块链，无法被修改
3. **完全透明**: 任何人都可以验证学生的经验值和阶段
4. **自动升级**: 根据经验值自动计算阶段，无需手动干预
5. **可追溯**: 所有经验值变更都有区块链交易记录

---

## 🔮 未来扩展

1. **跨链支持**: 在不同链上展示同一宠物
2. **NFT 交易**: 允许学生交易宠物 NFT
3. **社区功能**: 宠物排行榜、成就系统
4. **元数据优化**: 使用 IPFS 存储宠物图片和动画

---

## 📚 相关文档

- [教师授权方法](./TEACHER_AUTHORIZATION.md)
- [配置文件示例](./CONFIG_EXAMPLE.md)
- [部署脚本](./blockchain/scripts/deploy_advanced.ts)

---

**🎊 恭喜！您的学习宠物系统现已完全去中心化！**

