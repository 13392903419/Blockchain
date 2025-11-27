const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function testAccessPassRedeem() {
  try {
    // Connect to MongoDB
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();

    const db = client.db('nft_attendance');
    const collection = db.collection('accesspasses');

    console.log('🔍 检查通行证数据...');

    // Find unredeemed passes
    const unredeemedPasses = await collection.find({ isRedeemed: false }).toArray();
    console.log(`找到 ${unredeemedPasses.length} 个未兑换的通行证`);

    if (unredeemedPasses.length > 0) {
      console.log('示例通行证:');
      unredeemedPasses.slice(0, 2).forEach((pass, index) => {
        console.log(`${index + 1}. ID: ${pass._id}, Student: ${pass.studentAddress}, TokenID: ${pass.tokenId}, Redeemed: ${pass.isRedeemed}`);
      });

      // Test redeem simulation
      const testPass = unredeemedPasses[0];
      console.log(`\n🧪 测试兑换通行证 ${testPass._id}...`);

      // Simulate the redeem operation
      const result = await collection.findOneAndUpdate(
        { _id: testPass._id },
        { $set: { isRedeemed: true } },
        { returnDocument: 'after' }
      );

      if (result) {
        console.log('✅ 兑换成功:', {
          _id: result._id,
          isRedeemed: result.isRedeemed,
          studentAddress: result.studentAddress
        });
      } else {
        console.log('❌ 兑换失败');
      }
    }

    await client.close();
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testAccessPassRedeem();
