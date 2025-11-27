// 测试修复后的作品创建和认证功能
const { db } = require('./backend/src/database');

async function testWorkCreationAndEndorsement() {
  try {
    console.log('🔍 测试作品创建和认证功能修复...\n');

    // 1. 创建一个新的作品（模拟前端行为）
    console.log('1. 创建新作品...');
    const newWork = {
      studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      title: '修复后的测试作品',
      description: '这个作品应该有正确的tokenId',
      fileUrl: 'https://github.com/test/repo',
      tokenId: '12345678', // 8位数字ID
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    };

    const createdWork = await db.createStudentWork(newWork);
    console.log('✅ 作品创建成功:', {
      id: createdWork._id,
      title: createdWork.title,
      tokenId: createdWork.tokenId,
      isEndorsed: createdWork.isEndorsed
    });

    // 2. 查看所有作品
    console.log('\n2. 查看所有作品...');
    const allWorks = await db.getStudentWorks();
    console.log(`找到 ${allWorks.length} 个作品:`);
    allWorks.forEach((work, index) => {
      console.log(`  ${index + 1}. "${work.title}" - TokenID: ${work.tokenId} - 已认证: ${work.isEndorsed}`);
    });

    // 3. 选择刚创建的作品进行认证
    const workToEndorse = allWorks.find(work => work.title === '修复后的测试作品' && !work.isEndorsed);
    if (workToEndorse) {
      console.log(`\n3. 认证作品: "${workToEndorse.title}"`);

      // 检查tokenId
      if (!workToEndorse.tokenId || workToEndorse.tokenId === '0') {
        console.log('❌ TokenID无效，无法认证');
      } else {
        console.log(`✅ TokenID有效: ${workToEndorse.tokenId}`);

        // 进行认证
        await db.endorseStudentWork(workToEndorse._id);
        console.log('✅ 作品认证成功');
      }

      // 4. 重新检查认证状态
      console.log('\n4. 重新检查认证状态...');
      const updatedWorks = await db.getStudentWorks();
      const updatedWork = updatedWorks.find(work => work._id === workToEndorse._id);

      if (updatedWork) {
        console.log(`最终认证状态: ${updatedWork.isEndorsed ? '✅ 已认证' : '❌ 未认证'}`);
      }
    } else {
      console.log('❌ 没有找到合适的作品进行认证');
    }

    console.log('\n📋 最终作品状态:');
    const finalWorks = await db.getStudentWorks();
    finalWorks.forEach((work, index) => {
      console.log(`  ${index + 1}. "${work.title}" - TokenID: ${work.tokenId} - 已认证: ${work.isEndorsed}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testWorkCreationAndEndorsement().then(() => {
  console.log('\n🎉 作品创建和认证测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 测试失败:', error);
  process.exit(1);
});
