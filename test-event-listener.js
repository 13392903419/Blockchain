const { ethers } = require("ethers");

// 测试区块链事件监听
async function testEventListener() {
  console.log('🧪 测试区块链事件监听...\n');

  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    console.log('✅ 连接到区块链提供者');

    const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    console.log('📋 合约地址:', contractAddress);

    const contract = new ethers.Contract(
      contractAddress,
      [
        "event AttendanceRecorded(uint256 indexed sessionId, address indexed student, uint256 tokenId)"
      ],
      provider
    );

    console.log('🎧 监听器设置成功');

    // 监听事件
    contract.on("AttendanceRecorded", (sessionId, student, tokenId, event) => {
      console.log('📢 监听到事件!');
      console.log('   Session ID:', sessionId.toString());
      console.log('   Student:', student);
      console.log('   Token ID:', tokenId.toString());
      console.log('   Transaction Hash:', event.log.transactionHash);
      console.log('   Block Number:', event.log.blockNumber);
    });

    console.log('✅ 事件监听器已启动，请在前端铸造NFT来测试');

    // 保持运行
    setInterval(() => {
      console.log('⏳ 监听中... (按Ctrl+C退出)');
    }, 10000);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testEventListener();
