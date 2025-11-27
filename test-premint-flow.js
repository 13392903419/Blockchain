// 测试预铸造 + 签到完整流程
const { ethers } = require('./backend/node_modules/ethers');

async function testPremintFlow() {
  console.log('🧪 测试预铸造功能...\n');

  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    // 合约地址
    const contractAddress = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
    const contractABI = [
      {
        "inputs": [
          { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
          { "internalType": "address", "name": "student", "type": "address" },
          { "internalType": "string", "name": "tokenUri", "type": "string" }
        ],
        "name": "preMintAttendance",
        "outputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
          { "internalType": "address", "name": "student", "type": "address" }
        ],
        "name": "getPreMintedToken",
        "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // 使用后端私钥（和服务器使用相同的）
    const teacherWallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const premintContract = new ethers.Contract(contractAddress, contractABI, teacherWallet);

    // 测试地址
    const teacherAddr = await teacherWallet.getAddress();
    const studentAddr = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';

    const contract = new ethers.Contract(contractAddress, contractABI, teacherWallet);

    const sessionId = 999; // 测试用的sessionId

    console.log('📋 测试参数:');
    console.log('   合约地址:', contractAddress);
    console.log('   Session ID:', sessionId);
    console.log('   教师地址:', teacherAddr);
    console.log('   学生地址:', studentAddr);
    console.log();

    // 步骤1：检查初始状态
    console.log('🔍 检查初始状态');
    const initialTokenId = await premintContract.getPreMintedToken(sessionId, studentAddr);
    console.log('   初始预铸造Token ID:', initialTokenId.toString());

    // 步骤2：教师预铸造NFT
    console.log('\n🎯 教师预铸造NFT');

    const preMintTx = await premintContract.preMintAttendance(
      sessionId,
      studentAddr,
      'ipfs://test-attendance'
    );
    const preMintReceipt = await preMintTx.wait();

    console.log('✅ 预铸造成功，交易哈希:', preMintTx.hash);

    // 步骤3：检查预铸造结果
    console.log('\n🔍 检查预铸造结果');
    const preMintedTokenId = await premintContract.getPreMintedToken(sessionId, studentAddr);
    console.log('🎯 预铸造的Token ID:', preMintedTokenId.toString());

    if (preMintedTokenId.toString() !== '0') {
      console.log('\n🎉 预铸造功能测试成功！');
      console.log('✅ 教师可以预先铸造NFT给学生');
      console.log('✅ 预铸造的NFT被正确记录');
    } else {
      console.log('\n❌ 预铸造功能测试失败');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testPremintFlow();
