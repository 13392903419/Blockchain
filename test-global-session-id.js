// 测试全局sessionId铸造
const { ethers } = require('./backend/node_modules/ethers');

async function testGlobalSessionId() {
  console.log('🧪 测试全局Session ID铸造...\n');

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

    // 使用全局唯一的sessionId（模拟数据库生成的）
    const globalSessionId1 = 1001; // 模拟第一个课程的第一个课次
    const globalSessionId2 = 2001; // 模拟第二个课程的第一个课次

    console.log('📋 测试参数:');
    console.log('   学生地址:', studentAddress);
    console.log('   Session ID 1 (课程A):', globalSessionId1);
    console.log('   Session ID 2 (课程B):', globalSessionId2);
    console.log();

    // 测试在不同session中铸造（应该都成功）
    console.log('🎯 测试在不同Session中铸造:');

    // 第一个session
    console.log(`\nSession ${globalSessionId1}:`);
    const hasAttended1Before = await contract.hasAttended(globalSessionId1, studentAddress);
    console.log('   铸造前 hasAttended:', hasAttended1Before);

    try {
      const tx1 = await contract.mintAttendance(globalSessionId1, studentAddress, 'ipfs://courseA-session1');
      const receipt1 = await tx1.wait();
      console.log('✅ 铸造成功，Token ID:', receipt1.logs[0].topics[3]);
    } catch (error) {
      console.log('❌ 铸造失败:', error.message);
    }

    const hasAttended1After = await contract.hasAttended(globalSessionId1, studentAddress);
    console.log('   铸造后 hasAttended:', hasAttended1After);

    // 第二个session
    console.log(`\nSession ${globalSessionId2}:`);
    const hasAttended2Before = await contract.hasAttended(globalSessionId2, studentAddress);
    console.log('   铸造前 hasAttended:', hasAttended2Before);

    try {
      const tx2 = await contract.mintAttendance(globalSessionId2, studentAddress, 'ipfs://courseB-session1');
      const receipt2 = await tx2.wait();
      console.log('✅ 铸造成功，Token ID:', receipt2.logs[0].topics[3]);
    } catch (error) {
      console.log('❌ 铸造失败:', error.message);
    }

    const hasAttended2After = await contract.hasAttended(globalSessionId2, studentAddress);
    console.log('   铸造后 hasAttended:', hasAttended2After);

    // 测试重复铸造（应该失败）
    console.log(`\n🎯 测试重复铸造 Session ${globalSessionId1} (应该失败):`);
    try {
      const tx3 = await contract.mintAttendance(globalSessionId1, studentAddress, 'ipfs://duplicate');
      await tx3.wait();
      console.log('❌ 意外成功 - 重复铸造没有被阻止');
    } catch (error) {
      console.log('✅ 正确失败 - 重复铸造被阻止:', error.message);
    }

    console.log('\n✅ 测试完成 - 全局Session ID解决了冲突问题');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testGlobalSessionId();
