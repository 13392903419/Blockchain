// 测试课程名显示功能
const mongoose = require('./backend/node_modules/mongoose');

// 连接到 MongoDB
mongoose.connect('mongodb://localhost:27017/nft_attendance');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');

  try {
    // 获取一个学生的出勤记录
    const studentAddress = '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc';
    console.log(`\n📋 学生 ${studentAddress} 的出勤记录:`);

    const attendanceRecords = await db.db.collection('attendancerecords').find({
      studentAddress: studentAddress.toLowerCase()
    }).toArray();

    console.log(`找到 ${attendanceRecords.length} 条记录\n`);

    // 模拟前端显示逻辑
    for (const record of attendanceRecords.slice(0, 3)) { // 只显示前3条
      console.log(`记录 ${record._id}:`);
      console.log(`  Session ID: ${record.sessionId}`);

      // 查找对应的session信息
      const session = await db.db.collection('sessions').findOne({ _id: record.sessionId });
      if (session) {
        console.log(`  Session Name: ${session.name}`);
        console.log(`  Course ID: ${session.courseId}`);

        // 查找对应的课程信息
        const course = await db.db.collection('courses').findOne({ _id: session.courseId });
        if (course) {
          console.log(`  Course Name: ${course.name}`);
          console.log(`  ✅ 显示: 课程="${course.name}", 课次="${session.name}"`);
        } else {
          console.log(`  ❌ 未找到课程信息`);
        }
      } else {
        console.log(`  ❌ 未找到session信息`);
      }

      console.log(`  Token ID: ${record.tokenId}`);
      console.log(`  Status: ${record.status}`);
      console.log('  ---');
    }

    console.log('\n✅ 测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  mongoose.connection.close();
});
