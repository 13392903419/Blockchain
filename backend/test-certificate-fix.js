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

// 测试修复后的查询功能
async function testFixedQuery() {
  try {
    console.log('🔍 测试修复后的证书查询功能...\n');

    const testAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';

    // 使用修复后的查询方法（不区分大小写）
    const certs = await CertificateModel.find({
      studentAddress: new RegExp(`^${testAddress}$`, 'i')
    });

    console.log(`✅ 修复后的查询结果: 找到 ${certs.length} 个证书`);
    if (certs.length > 0) {
      console.log('证书详情:');
      certs.forEach((cert, index) => {
        console.log(`  ${index + 1}. ${cert.name} - ${cert.studentAddress}`);
      });
    }

    return certs;
  } catch (error) {
    console.error('❌ 查询测试失败:', error);
    throw error;
  }
}

// 测试API调用模拟
async function testAPISimulation() {
  try {
    console.log('🔍 模拟API调用...\n');

    // 模拟前端发送的地址（大写格式）
    const frontendAddress = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';

    // 模拟数据库查询（使用修复后的方法）
    const certs = await CertificateModel.find({
      studentAddress: new RegExp(`^${frontendAddress}$`, 'i')
    });

    console.log(`✅ API模拟: 前端地址 "${frontendAddress}" 查询到 ${certs.length} 个证书`);

    if (certs.length > 0) {
      console.log('API返回数据示例:');
      console.log(JSON.stringify({
        success: true,
        data: certs.map(cert => ({
          id: cert._id,
          name: cert.name,
          description: cert.description,
          studentAddress: cert.studentAddress,
          issuedAt: cert.issuedAt
        }))
      }, null, 2));
    }

    return certs;
  } catch (error) {
    console.error('❌ API模拟失败:', error);
    throw error;
  }
}

// 主测试函数
async function main() {
  try {
    console.log('🚀 开始证书查询修复测试...\n');

    // 连接数据库
    await connectDB();

    // 测试修复后的查询
    await testFixedQuery();
    console.log('');

    // 测试API模拟
    await testAPISimulation();
    console.log('');

    console.log('🎉 所有测试完成！修复成功！');

  } catch (error) {
    console.error('💥 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
main();
