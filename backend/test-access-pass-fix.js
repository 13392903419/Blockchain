// 测试通行证功能的修复
const { db } = require('./src/database');

async function testAccessPassCreationAndRedemption() {
  try {
    console.log('🔍 测试通行证创建和兑换功能修复...\n');

    // 1. 创建一个新的通行证（模拟教师发行）
    console.log('1. 创建新通行证...');
    const newPass = {
      studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      passType: 1, // OFFICE_HOUR_PASS
      amount: 2,
      tokenId: 1, // 真实的数字tokenId
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    };

    const createdPass = await db.createAccessPass(newPass);
    console.log('✅ 通行证创建成功:', {
      id: createdPass._id,
      studentAddress: createdPass.studentAddress,
      passType: createdPass.passType,
      tokenId: createdPass.tokenId,
      amount: createdPass.amount,
      isRedeemed: createdPass.isRedeemed
    });

    // 2. 查看所有通行证
    console.log('\n2. 查看所有通行证...');
    const allPasses = await db.getAccessPasses(newPass.studentAddress);
    console.log(`找到 ${allPasses.length} 个通行证:`);
    allPasses.forEach((pass, index) => {
      console.log(`  ${index + 1}. 类型: ${pass.passType} - TokenID: ${pass.tokenId} - 数量: ${pass.amount} - 已兑换: ${pass.isRedeemed}`);
    });

    // 3. 模拟兑换通行证（标记为已兑换）
    const passToRedeem = allPasses.find(pass => !pass.isRedeemed && pass.passType === 1);
    if (passToRedeem) {
      console.log(`\n3. 兑换通行证 (ID: ${passToRedeem._id})`);

      // 验证tokenId格式
      console.log(`通行证tokenId: ${passToRedeem.tokenId} (类型: ${typeof passToRedeem.tokenId})`);

      if (typeof passToRedeem.tokenId === 'number') {
        console.log('✅ TokenID格式正确');

        // 模拟兑换（在实际应用中，这会在区块链上发生）
        // 这里我们直接更新数据库状态
        await db.redeemAccessPass(passToRedeem._id);
        console.log('✅ 通行证兑换成功');
      } else {
        console.log('❌ TokenID格式错误');
      }

      // 4. 重新检查兑换状态
      console.log('\n4. 重新检查兑换状态...');
      const updatedPasses = await db.getAccessPasses(newPass.studentAddress);
      const updatedPass = updatedPasses.find(pass => pass._id === passToRedeem._id);

      if (updatedPass) {
        console.log(`最终兑换状态: ${updatedPass.isRedeemed ? '✅ 已兑换' : '❌ 未兑换'}`);
      }
    } else {
      console.log('❌ 没有找到合适的通行证进行兑换');
    }

    console.log('\n📋 最终通行证状态:');
    const finalPasses = await db.getAccessPasses(newPass.studentAddress);
    finalPasses.forEach((pass, index) => {
      console.log(`  ${index + 1}. 类型: ${pass.passType} - TokenID: ${pass.tokenId} - 数量: ${pass.amount} - 已兑换: ${pass.isRedeemed}`);
    });

    // 5. 测试不同类型的通行证
    console.log('\n5. 测试不同类型的通行证...');
    const testPasses = [
      { passType: 2, tokenId: 2, name: '实验室访问权限' },
      { passType: 3, tokenId: 3, name: '工作坊参与券' }
    ];

    for (const testPass of testPasses) {
      const passData = {
        studentAddress: newPass.studentAddress,
        passType: testPass.passType,
        amount: 1,
        tokenId: testPass.tokenId,
        txHash: `0x${Math.random().toString(16).slice(2)}`
      };

      const createdTestPass = await db.createAccessPass(passData);
      console.log(`✅ 创建 ${testPass.name}: TokenID=${createdTestPass.tokenId}`);
    }

    // 查看最终结果
    const allFinalPasses = await db.getAccessPasses(newPass.studentAddress);
    console.log(`\n📊 学生总共有 ${allFinalPasses.length} 个通行证:`);
    allFinalPasses.forEach((pass, index) => {
      const typeNames = { 1: '教师办公室预约券', 2: '实验室访问权限', 3: '工作坊参与券' };
      console.log(`  ${index + 1}. ${typeNames[pass.passType] || '未知类型'} (ID: ${pass.tokenId}) - 数量: ${pass.amount} - ${pass.isRedeemed ? '已兑换' : '未兑换'}`);
    });

  } catch (error) {
    console.error('❌ 通行证测试失败:', error);
    throw error;
  }
}

// 运行测试
testAccessPassCreationAndRedemption().then(() => {
  console.log('\n🎉 通行证创建和兑换测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 测试失败:', error);
  process.exit(1);
});
