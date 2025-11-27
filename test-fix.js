// 测试铸造和出勤记录修复
const { ethers } = require('ethers');

// 模拟铸造过程
async function testMinting() {
  console.log('🧪 测试铸造和出勤记录修复...\n');

  try {
    // 连接到区块链
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    console.log('✅ 连接到区块链');

    // 获取签名者
    const signers = await provider.listAccounts();
    const teacherAddress = signers[0]; // 假设第一个是教师
    const studentAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';

    console.log('教师地址:', teacherAddress);
    console.log('学生地址:', studentAddress);

    // 合约信息
    const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    const contractABI = [
      {
        "inputs": [
          { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
          { "internalType": "address", "name": "student", "type": "address" },
          { "internalType": "string", "name": "tokenUri", "type": "string" }
        ],
        "name": "mintAttendance",
        "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    // 创建合约实例
    const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log('开始铸造NFT...');

    // 铸造NFT - 使用sessionId = 1 (对应CN课程的第1次课)
    const tx = await contract.mintAttendance(
      1, // sessionNumber
      studentAddress,
      'ipfs://metadata'
    );

    console.log('铸造交易已发送:', tx.hash);

    const receipt = await tx.wait();
    console.log('铸造交易已确认');

    console.log('🎉 铸造成功！交易哈希:', tx.hash);
    console.log('✅ 现在应该能看到事件监听器处理此交易并记录到数据库');

    // 等待一段时间让事件监听器处理
    console.log('⏳ 等待事件监听器处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ 测试完成，请检查数据库和事件监听器日志');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testMinting();
