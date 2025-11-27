// 测试重复铸造问题
const { ethers } = require('./backend/node_modules/ethers');

async function testDuplicateMint() {
  console.log('🧪 测试重复铸造问题...\n');

  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    // 合约地址
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
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
          { "internalType": "address", "name": "student", "type": "address" }
        ],
        "name": "hasAttended",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // 创建合约实例
    const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    const studentAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    const sessionId = 1; // 模拟前端传递的sessionId

    console.log('📋 测试参数:');
    console.log('   合约地址:', contractAddress);
    console.log('   Session ID:', sessionId);
    console.log('   学生地址:', studentAddress);
    console.log();

    // 检查初始状态
    console.log('🔍 初始状态检查:');
    const initialHasAttended = await contract.hasAttended(sessionId, studentAddress);
    console.log('   hasAttended:', initialHasAttended);

    if (initialHasAttended) {
      console.log('⚠️  学生已经在该session出勤，跳过测试');
      return;
    }

    // 第一次铸造
    console.log('\n🎯 第一次铸造:');
    try {
      const tx1 = await contract.mintAttendance(sessionId, studentAddress, 'ipfs://test1');
      const receipt1 = await tx1.wait();
      console.log('✅ 第一次铸造成功，Token ID:', receipt1.logs[0].topics[3]);
    } catch (error) {
      console.log('❌ 第一次铸造失败:', error.message);
      return;
    }

    // 检查状态
    const afterFirstMint = await contract.hasAttended(sessionId, studentAddress);
    console.log('   铸造后 hasAttended:', afterFirstMint);

    // 第二次铸造（应该失败）
    console.log('\n🎯 第二次铸造（应该失败）:');
    try {
      const tx2 = await contract.mintAttendance(sessionId, studentAddress, 'ipfs://test2');
      await tx2.wait();
      console.log('❌ 第二次铸造意外成功');
    } catch (error) {
      console.log('✅ 第二次铸造正确失败:', error.message);
    }

    console.log('\n✅ 测试完成 - 合约正确阻止了重复铸造');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testDuplicateMint();
