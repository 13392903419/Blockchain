const mongoose = require('mongoose');

// 连接到 MongoDB
mongoose.connect('mongodb://localhost:27017/nft_attendance');

// 获取数据库连接
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  // 获取所有集合
  const collections = await db.db.listCollections().toArray();
  console.log('\n📊 数据库集合列表:');
  collections.forEach(collection => {
    console.log(`- ${collection.name}`);
  });
  
  // 检查每个集合的数据
  for (const collection of collections) {
    const count = await db.db.collection(collection.name).countDocuments();
    console.log(`\n📋 ${collection.name} 集合:`);
    console.log(`   文档数量: ${count}`);

    if (count > 0) {
      if (collection.name === 'attendancerecords') {
        console.log('\n🔍 出勤记录详情:');
        const records = await db.db.collection(collection.name).find({}).toArray();
        records.forEach((record, index) => {
          console.log(`\n记录 ${index + 1}:`);
          console.log(`  ID: ${record._id}`);
          console.log(`  Session ID: ${record.sessionId}`);
          console.log(`  Student: ${record.studentAddress}`);
          console.log(`  Token ID: ${record.tokenId}`);
          console.log(`  Tx Hash: ${record.txHash}`);
          console.log(`  Status: ${record.status}`);
          console.log(`  Timestamp: ${record.timestamp}`);
        });

        // 查找特定的交易哈希
        const targetTxHash = '0x48eb74106d20d8b61048c64c20208aa78dd042b5a454ac7fd87a75e3971d5192';
        const targetRecord = records.find(r => r.txHash === targetTxHash);
        if (targetRecord) {
          console.log(`\n✅ 找到目标交易哈希的记录: ${targetRecord._id}`);
        } else {
          console.log(`\n❌ 未找到目标交易哈希的记录`);
        }
      } else if (collection.name === 'sessions') {
        console.log('\n🔍 课次详情:');
        const sessions = await db.db.collection(collection.name).find({}).toArray();
        sessions.forEach((session, index) => {
          console.log(`\n课次 ${index + 1}:`);
          console.log(`  ID: ${session._id}`);
          console.log(`  Course ID: ${session.courseId}`);
          console.log(`  Session Number: ${session.sessionNumber}`);
          console.log(`  Name: ${session.name}`);
          console.log(`  Start Time: ${new Date(session.startTime).toISOString()}`);
          console.log(`  End Time: ${new Date(session.endTime).toISOString()}`);
        });
      } else if (collection.name === 'courses') {
        console.log('\n🔍 课程详情:');
        const courses = await db.db.collection(collection.name).find({}).toArray();
        courses.forEach((course, index) => {
          console.log(`\n课程 ${index + 1}:`);
          console.log(`  ID: ${course._id}`);
          console.log(`  Name: ${course.name}`);
          console.log(`  Teacher: ${course.teacherAddress}`);
        });
      } else {
        const sample = await db.db.collection(collection.name).findOne();
        console.log(`   示例文档:`, JSON.stringify(sample, null, 2));
      }
    }
  }
  
  mongoose.connection.close();
});
