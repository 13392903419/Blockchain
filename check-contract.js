// 检查合约状态和权限
const { ethers } = require('./backend/node_modules/ethers');

async function checkContracts() {
  console.log('🔍 检查合约状态和权限...\n');

  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    // 合约地址
    const attendanceNFTAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    const roleManagerAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

    console.log('📋 合约地址:');
    console.log('   AttendanceNFT:', attendanceNFTAddress);
    console.log('   RoleManager:', roleManagerAddress);
    console.log();

    // 检查合约代码是否存在
    const attendanceCode = await provider.getCode(attendanceNFTAddress);
    const roleManagerCode = await provider.getCode(roleManagerAddress);

    console.log('📦 合约部署状态:');
    console.log('   AttendanceNFT:', attendanceCode !== '0x' ? '✅ 已部署' : '❌ 未部署');
    console.log('   RoleManager:', roleManagerCode !== '0x' ? '✅ 已部署' : '❌ 未部署');

    if (attendanceCode === '0x' || roleManagerCode === '0x') {
      console.log('\n❌ 合约未正确部署，请重新部署合约');
      return;
    }

    console.log();

    // 创建合约实例
    const attendanceContract = new ethers.Contract(
      attendanceNFTAddress,
      [
        "function roleManager() view returns (address)",
        "function owner() view returns (address)",
        "function hasAttended(uint256 sessionId, address student) view returns (bool)"
      ],
      provider
    );

    const roleManagerContract = new ethers.Contract(
      roleManagerAddress,
      [
        "function isTeacher(address) view returns (bool)",
        "function isStudent(address) view returns (bool)"
      ],
      provider
    );

    // 检查配置
    const configuredRoleManager = await attendanceContract.roleManager();
    const owner = await attendanceContract.owner();

    console.log('⚙️ 合约配置:');
    console.log('   AttendanceNFT Owner:', owner);
    console.log('   AttendanceNFT RoleManager:', configuredRoleManager);
    console.log('   配置是否正确:', configuredRoleManager.toLowerCase() === roleManagerAddress.toLowerCase() ? '✅' : '❌');

    // 获取测试地址
    const signers = await provider.listAccounts();
    console.log('\n👥 测试地址:');
    signers.slice(0, 3).forEach((addr, i) => {
      console.log(`   地址 ${i}: ${addr}`);
    });

    // 检查权限
    console.log('\n🔐 权限检查:');
    for (let i = 0; i < Math.min(3, signers.length); i++) {
      const addr = signers[i];
      try {
        const isTeacher = await roleManagerContract.isTeacher(addr);
        const isStudent = await roleManagerContract.isStudent(addr);
        console.log(`   ${String(addr).substring(0, 10)}...: 教师=${isTeacher}, 学生=${isStudent}`);
      } catch (error) {
        console.log(`   ${String(addr).substring(0, 10)}...: 权限检查失败 - ${error.message}`);
      }
    }

    // 检查出勤状态
    console.log('\n📊 出勤状态检查 (Session ID = 1):');
    const testSessionId = 1;
    for (let i = 0; i < Math.min(3, signers.length); i++) {
      const addr = signers[i];
      try {
        const hasAttended = await attendanceContract.hasAttended(testSessionId, addr);
        console.log(`   ${String(addr).substring(0, 10)}...: 已出勤=${hasAttended}`);
      } catch (error) {
        console.log(`   ${String(addr).substring(0, 10)}...: 检查失败 - ${error.message}`);
      }
    }

    console.log('\n✅ 合约状态检查完成');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkContracts();
