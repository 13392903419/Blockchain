const mongoose = require('mongoose');

// MongoDB 连接
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nft_attendance';

const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  courseId: { type: String, required: true },
  sessionNumber: { type: Number, required: true },
  globalSessionId: { type: Number },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SessionModel = mongoose.model('Session', sessionSchema);

async function testGlobalSessionFlow() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');

    console.log('\n🧪 开始测试全局Session ID流程\n');

    // 测试1: 模拟事件监听器逻辑
    console.log('📡 测试1: 模拟事件监听器 - Session ID映射');
    const contractSessionId = '7'; // 假设区块链上返回的sessionId

    const allSessions = await SessionModel.find();
    const matchingSession = allSessions.find((session) => session.globalSessionId?.toString() === contractSessionId);

    if (matchingSession) {
      console.log(`   ✅ 找到匹配session:`);
      console.log(`      - 数据库ID: ${matchingSession._id}`);
      console.log(`      - 课程ID: ${matchingSession.courseId}`);
      console.log(`      - Session编号: ${matchingSession.sessionNumber}`);
      console.log(`      - 全局Session ID: ${matchingSession.globalSessionId}`);
      console.log(`      - Session名称: ${matchingSession.name}`);
    } else {
      console.log(`   ❌ 未找到globalSessionId为 ${contractSessionId} 的session`);
    }

    // 测试2: 模拟前端铸造逻辑
    console.log('\n🎨 测试2: 模拟前端铸造 - 获取contractSessionId');
    const selectedSessionId = 'course_1763770812876_xseh74-1'; // 前端选择的sessionId

    // 模拟前端查找session的逻辑
    const selectedSession = allSessions.find(s => s._id === selectedSessionId);
    const contractSessionIdFromFrontend = selectedSession?.globalSessionId || selectedSessionId;

    console.log(`   前端选择的sessionId: ${selectedSessionId}`);
    console.log(`   转换为contractSessionId: ${contractSessionIdFromFrontend}`);
    console.log(`   类型: ${typeof contractSessionIdFromFrontend}`);

    // 测试3: 验证唯一性
    console.log('\n🔍 测试3: 验证globalSessionId唯一性');
    const globalIdMap = {};
    let hasDuplicates = false;

    allSessions.forEach(session => {
      if (session.globalSessionId) {
        if (globalIdMap[session.globalSessionId]) {
          console.log(`   ❌ 重复的globalSessionId: ${session.globalSessionId}`);
          console.log(`      - ${globalIdMap[session.globalSessionId]}`);
          console.log(`      - ${session._id}`);
          hasDuplicates = true;
        } else {
          globalIdMap[session.globalSessionId] = session._id;
        }
      }
    });

    if (!hasDuplicates) {
      console.log(`   ✅ 所有globalSessionId都是唯一的`);
    }

    // 测试4: 模拟学生签到API
    console.log('\n📝 测试4: 模拟学生签到 - session查找');
    const requestedSessionId = 'course_1763770812876_xseh74-1'; // 学生选择的sessionId

    const session = await SessionModel.findOne({ _id: requestedSessionId });
    if (session) {
      const contractSessionIdForCheckin = session.globalSessionId || session.sessionNumber;
      console.log(`   ✅ 找到session: ${session._id}`);
      console.log(`   全局Session ID: ${session.globalSessionId}`);
      console.log(`   Session编号: ${session.sessionNumber}`);
      console.log(`   合约调用使用的ID: ${contractSessionIdForCheckin}`);
      console.log(`   类型: ${typeof contractSessionIdForCheckin}`);
    } else {
      console.log(`   ❌ 未找到session: ${requestedSessionId}`);
    }

    // 总结测试结果
    console.log('\n🎯 测试总结:');

    const testResults = [
      { name: '事件监听器映射', status: !!matchingSession },
      { name: '前端铸造参数转换', status: typeof contractSessionIdFromFrontend === 'number' },
      { name: 'globalSessionId唯一性', status: !hasDuplicates },
      { name: '学生签到session查找', status: !!session }
    ];

    let allPassed = true;
    testResults.forEach(test => {
      const status = test.status ? '✅ 通过' : '❌ 失败';
      console.log(`   ${test.name}: ${status}`);
      if (!test.status) allPassed = false;
    });

    console.log(`\n🏁 总体测试结果: ${allPassed ? '✅ 全部通过' : '❌ 有失败项'}`);

    if (allPassed) {
      console.log('\n🎉 全局Session ID流程测试成功！');
      console.log('   区块链与数据库的session映射已正确实现');
      console.log('   不再存在session ID冲突问题');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// 运行测试
testGlobalSessionFlow().then((success) => {
  console.log('\n🏁 流程测试完成');
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('\n💥 流程测试失败:', error);
  process.exit(1);
});
