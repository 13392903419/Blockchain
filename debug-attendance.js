const mongoose = require('./backend/node_modules/mongoose');

// 连接到 MongoDB
mongoose.connect('mongodb://localhost:27017/nft_attendance');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');

  try {
    // 获取所有出勤记录
    console.log('\n🔍 所有出勤记录:');
    const attendanceRecords = await db.db.collection('attendancerecords').find({}).toArray();

    attendanceRecords.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  ID: ${record._id}`);
      console.log(`  Session ID: ${record.sessionId}`);
      console.log(`  Student: ${record.studentAddress}`);
      console.log(`  Token ID: ${record.tokenId}`);
      console.log(`  Tx Hash: ${record.txHash}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Timestamp: ${record.timestamp}`);
    });

    // 查找目标交易哈希
    const targetTxHash = '0x48eb74106d20d8b61048c64c20208aa78dd042b5a454ac7fd87a75e3971d5192';
    const targetRecord = attendanceRecords.find(r => r.txHash === targetTxHash);
    if (targetRecord) {
      console.log(`\n✅ 找到目标交易哈希的记录: ${targetRecord._id}`);
    } else {
      console.log(`\n❌ 未找到目标交易哈希的记录`);
    }

    // 获取所有课次
    console.log('\n🔍 所有课次:');
    const sessions = await db.db.collection('sessions').find({}).toArray();

    sessions.forEach((session, index) => {
      console.log(`\n课次 ${index + 1}:`);
      console.log(`  ID: ${session._id}`);
      console.log(`  Course ID: ${session.courseId}`);
      console.log(`  Session Number: ${session.sessionNumber}`);
      console.log(`  Name: ${session.name}`);
    });

    // 获取所有课程
    console.log('\n🔍 所有课程:');
    const courses = await db.db.collection('courses').find({}).toArray();

    courses.forEach((course, index) => {
      console.log(`\n课程 ${index + 1}:`);
      console.log(`  ID: ${course._id}`);
      console.log(`  Name: ${course.name}`);
      console.log(`  Teacher: ${course.teacherAddress}`);
    });

    // 查找用户提到的课程
    const targetCourseId = 'course_1763722821785_k1qj82';
    const targetCourse = courses.find(c => c._id === targetCourseId);
    if (targetCourse) {
      console.log(`\n✅ 找到目标课程: ${targetCourse.name}`);

      // 查找该课程的所有课次
      const courseSessions = sessions.filter(s => s.courseId === targetCourseId);
      console.log(`该课程有 ${courseSessions.length} 个课次:`);

      courseSessions.forEach(session => {
        console.log(`  课次ID: ${session._id}, 名称: ${session.name}`);

        // 查找该课次的出勤记录
        const sessionAttendance = attendanceRecords.filter(r => r.sessionId === session._id);
        console.log(`  出勤记录数: ${sessionAttendance.length}`);

        sessionAttendance.forEach(record => {
          console.log(`    学生: ${record.studentAddress}, Token ID: ${record.tokenId}, Tx: ${record.txHash}`);
        });
      });
    } else {
      console.log(`\n❌ 未找到目标课程: ${targetCourseId}`);
    }

    // 查找sessionId为"1"的记录
    const session1Records = attendanceRecords.filter(r => r.sessionId === '1');
    console.log(`\n🔍 Session ID "1" 的出勤记录:`);
    console.log(`记录数量: ${session1Records.length}`);

    session1Records.forEach(record => {
      console.log(`  学生: ${record.studentAddress}`);
      console.log(`  Tx Hash: ${record.txHash}`);
      console.log(`  Token ID: ${record.tokenId}`);
      console.log(`  ---`);
    });

    // 检查学生地址匹配
    const targetStudent = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    const studentRecords = attendanceRecords.filter(r =>
      r.studentAddress.toLowerCase() === targetStudent.toLowerCase()
    );
    console.log(`\n🔍 学生 ${targetStudent} 的出勤记录:`);
    console.log(`记录数量: ${studentRecords.length}`);

    studentRecords.forEach(record => {
      console.log(`  Session ID: ${record.sessionId}`);
      console.log(`  Tx Hash: ${record.txHash}`);
      console.log(`  Token ID: ${record.tokenId}`);
      console.log(`  ---`);
    });

  } catch (error) {
    console.error('查询错误:', error);
  }

  mongoose.connection.close();
});
