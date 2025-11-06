const mongoose = require('mongoose');

// 连接到 MongoDB
mongoose.connect('mongodb://localhost:27017/nft_attendance');

// 获取数据库连接
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    // 创建示例课程
    const courseData = {
      id: 'course_demo_001',
      name: '区块链技术基础',
      description: 'NFT出勤系统演示课程',
      teacherAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 创建示例课次
    const sessionData = {
      id: 'session_demo_001',
      courseId: 'course_demo_001',
      name: '第一课：智能合约入门',
      description: '学习智能合约的基本概念',
      startTime: Date.now() - 86400000, // 昨天
      endTime: Date.now() - 82800000,   // 昨天+1小时
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 创建示例用户
    const userData = {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      role: 'teacher',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };
    
    // 创建示例出勤记录
    const attendanceData = {
      id: 'attendance_demo_001',
      sessionId: 'session_demo_001',
      studentAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      tokenId: '12345',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      status: 'present',
      timestamp: new Date()
    };
    
    // 插入数据
    await db.db.collection('courses').insertOne(courseData);
    console.log('✅ 课程数据已插入');
    
    await db.db.collection('sessions').insertOne(sessionData);
    console.log('✅ 课次数据已插入');
    
    await db.db.collection('users').insertOne(userData);
    console.log('✅ 用户数据已插入');
    
    await db.db.collection('attendancerecords').insertOne(attendanceData);
    console.log('✅ 出勤记录已插入');
    
    // 验证数据
    const courseCount = await db.db.collection('courses').countDocuments();
    const sessionCount = await db.db.collection('sessions').countDocuments();
    const userCount = await db.db.collection('users').countDocuments();
    const attendanceCount = await db.db.collection('attendancerecords').countDocuments();
    
    console.log('\n📊 数据统计:');
    console.log(`课程: ${courseCount} 条`);
    console.log(`课次: ${sessionCount} 条`);
    console.log(`用户: ${userCount} 条`);
    console.log(`出勤记录: ${attendanceCount} 条`);
    
    console.log('\n🎉 示例数据添加完成！现在可以在前端测试统计报表功能了。');
    
  } catch (error) {
    console.error('❌ 插入数据失败:', error);
  } finally {
    mongoose.connection.close();
  }
});
