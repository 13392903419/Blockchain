// 测试证书创建功能
const { db } = require('./src/database');

async function testCertificateCreation() {
  try {
    console.log('🔍 测试证书创建功能...\n');

    const testData = {
      studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      name: '测试证书',
      description: '通过API测试创建的证书',
      tokenId: '12345',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    };

    console.log('创建证书数据:', testData);

    // 测试 createCertificate 方法是否存在
    if (typeof db.createCertificate !== 'function') {
      throw new Error('db.createCertificate 方法不存在');
    }

    console.log('✅ db.createCertificate 方法存在');

    // 创建证书
    const certificate = await db.createCertificate(testData);
    console.log('✅ 证书创建成功:', certificate);

    // 验证证书是否正确保存
    const savedCertificates = await db.getCertificatesByStudent(testData.studentAddress);
    console.log(`✅ 数据库中找到 ${savedCertificates.length} 个证书`);

    const latestCert = savedCertificates[savedCertificates.length - 1];
    console.log('最新证书:', {
      id: latestCert._id,
      name: latestCert.name,
      studentAddress: latestCert.studentAddress,
      issuedAt: latestCert.issuedAt
    });

    return certificate;

  } catch (error) {
    console.error('❌ 证书创建测试失败:', error);
    throw error;
  }
}

// 运行测试
testCertificateCreation().then(() => {
  console.log('\n🎉 证书创建测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 测试失败:', error);
  process.exit(1);
});
