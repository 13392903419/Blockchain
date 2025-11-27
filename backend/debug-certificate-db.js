const mongoose = require('mongoose');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nft_attendance');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// 证书模型定义
const certificateSchema = new mongoose.Schema({
  _id: { type: String },
  studentAddress: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  tokenId: { type: String },
  txHash: { type: String },
  issuedAt: { type: Date, default: Date.now }
});

const CertificateModel = mongoose.model('Certificate', certificateSchema);

// 检查数据库中的证书
async function debugCertificates() {
  try {
    console.log('🔍 检查数据库中的证书...\n');

    // 查询所有证书
    const allCerts = await CertificateModel.find({});
    console.log('📋 所有证书 (find({})):', allCerts.length, '个');
    allCerts.forEach((cert, index) => {
      console.log(`  ${index + 1}. ID: ${cert._id}`);
      console.log(`     studentAddress: "${cert.studentAddress}"`);
      console.log(`     name: "${cert.name}"`);
      console.log(`     description: "${cert.description}"`);
      console.log('');
    });

    // 测试不同查询方式
    const testAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    console.log(`🔍 测试查询地址: "${testAddress}"`);
    console.log(`🔍 小写地址: "${testAddress.toLowerCase()}"\n`);

    // 精确匹配
    const exactMatch = await CertificateModel.find({ studentAddress: testAddress });
    console.log(`✅ 精确匹配结果: ${exactMatch.length} 个`);

    // 小写匹配
    const lowerMatch = await CertificateModel.find({ studentAddress: testAddress.toLowerCase() });
    console.log(`✅ 小写匹配结果: ${lowerMatch.length} 个`);

    // 正则匹配（不区分大小写）
    const regexMatch = await CertificateModel.find({
      studentAddress: new RegExp(testAddress, 'i')
    });
    console.log(`✅ 正则匹配结果: ${regexMatch.length} 个`);

    // 检查数据库中的实际字段值
    if (allCerts.length > 0) {
      const firstCert = allCerts[0];
      console.log(`🔍 第一个证书的studentAddress类型: ${typeof firstCert.studentAddress}`);
      console.log(`🔍 第一个证书的studentAddress值: "${firstCert.studentAddress}"`);
      console.log(`🔍 测试地址与存储地址比较: "${testAddress}" === "${firstCert.studentAddress}" ? ${testAddress === firstCert.studentAddress}`);
      console.log(`🔍 小写测试地址与存储地址比较: "${testAddress.toLowerCase()}" === "${firstCert.studentAddress}" ? ${testAddress.toLowerCase() === firstCert.studentAddress}`);
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await debugCertificates();
    console.log('\n🎉 调试完成！');
  } catch (error) {
    console.error('💥 调试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

main();
