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

// 测试创建证书
async function testCreateCertificate() {
  try {
    console.log('🔍 测试创建证书...');

    const testData = {
      studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      name: '优秀学生证书',
      description: '表现优异，学习认真',
      tokenId: '0',
      txHash: '0x1234567890abcdef'
    };

    const cert = await CertificateModel.create({
      _id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...testData
    });

    console.log('✅ 证书创建成功:', cert);

    // 查询所有证书
    const allCerts = await CertificateModel.find({});
    console.log('📋 数据库中的所有证书:', allCerts.length, '个');

    return cert;
  } catch (error) {
    console.error('❌ 证书创建失败:', error);
    throw error;
  }
}

// 测试查询证书
async function testGetCertificates() {
  try {
    console.log('🔍 测试查询证书...');

    const studentAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    const certs = await CertificateModel.find({ studentAddress: studentAddress.toLowerCase() });

    console.log(`✅ 找到 ${certs.length} 个证书 for ${studentAddress}`);
    console.log('证书详情:', certs);

    return certs;
  } catch (error) {
    console.error('❌ 证书查询失败:', error);
    throw error;
  }
}

// 主测试函数
async function main() {
  try {
    console.log('🚀 开始证书API测试...\n');

    // 连接数据库
    await connectDB();

    // 测试创建证书
    await testCreateCertificate();
    console.log('');

    // 测试查询证书
    await testGetCertificates();
    console.log('');

    console.log('🎉 所有测试完成！');

  } catch (error) {
    console.error('💥 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
main();
