// 测试作品认证功能
const { db } = require('./src/database');

async function testWorkEndorsement() {
  try {
    console.log('🔍 测试作品认证功能...\n');

    // 1. 查看数据库中的所有作品
    console.log('1. 查看所有作品...');
    const allWorks = await db.getStudentWorks();
    console.log(`找到 ${allWorks.length} 个作品:`);
    allWorks.forEach((work, index) => {
      console.log(`  ${index + 1}. ${work.title} - TokenID: ${work.tokenId} - 已认证: ${work.isEndorsed}`);
    });

    if (allWorks.length === 0) {
      console.log('❌ 没有找到任何作品，请先让学生创建作品');
      return;
    }

    // 2. 选择一个未认证的作品进行测试
    const unendorsedWork = allWorks.find(work => !work.isEndorsed);
    if (!unendorsedWork) {
      console.log('❌ 没有找到未认证的作品');
      return;
    }

    console.log(`\n2. 选择作品进行认证: "${unendorsedWork.title}"`);
    console.log(`TokenID: ${unendorsedWork.tokenId}`);
    console.log(`作品ID: ${unendorsedWork._id}`);

    // 3. 测试认证功能
    console.log('\n3. 测试认证功能...');
    await db.endorseStudentWork(unendorsedWork._id);

    // 4. 重新检查作品状态
    console.log('\n4. 重新检查作品状态...');
    const updatedWorks = await db.getStudentWorks();
    const updatedWork = updatedWorks.find(work => work._id === unendorsedWork._id);

    if (updatedWork) {
      console.log(`✅ 认证结果: ${updatedWork.isEndorsed ? '成功' : '失败'}`);
      console.log(`作品 "${updatedWork.title}" 认证状态: ${updatedWork.isEndorsed}`);
    } else {
      console.log('❌ 无法找到更新后的作品');
    }

    console.log('\n📋 更新后的所有作品状态:');
    updatedWorks.forEach((work, index) => {
      console.log(`  ${index + 1}. ${work.title} - 已认证: ${work.isEndorsed}`);
    });

  } catch (error) {
    console.error('❌ 作品认证测试失败:', error);
    throw error;
  }
}

// 运行测试
testWorkEndorsement().then(() => {
  console.log('\n🎉 作品认证测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 测试失败:', error);
  process.exit(1);
});
