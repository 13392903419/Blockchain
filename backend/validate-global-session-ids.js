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

async function validateGlobalSessionIds() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');

    // 获取所有session
    const sessions = await SessionModel.find();
    console.log(`📊 总共 ${sessions.length} 个session记录\n`);

    // 验证一：检查所有session都有globalSessionId
    console.log('🔍 验证一：检查globalSessionId完整性');
    let sessionsWithGlobalId = 0;
    let sessionsWithoutGlobalId = 0;
    const sessionsWithoutGlobalIdList = [];

    sessions.forEach(session => {
      if (session.globalSessionId) {
        sessionsWithGlobalId++;
      } else {
        sessionsWithoutGlobalId++;
        sessionsWithoutGlobalIdList.push(session);
      }
    });

    console.log(`   ✅ 有globalSessionId: ${sessionsWithGlobalId}`);
    console.log(`   ❌ 缺少globalSessionId: ${sessionsWithoutGlobalId}`);

    if (sessionsWithoutGlobalId > 0) {
      console.log('   缺少globalSessionId的session:');
      sessionsWithoutGlobalIdList.forEach(session => {
        console.log(`     - ${session._id} (courseId: ${session.courseId}, sessionNumber: ${session.sessionNumber})`);
      });
    }

    // 验证二：检查globalSessionId唯一性
    console.log('\n🔍 验证二：检查globalSessionId唯一性');
    const globalIdCounts = {};
    const duplicateGlobalIds = [];
    const uniqueGlobalIds = new Set();

    sessions.forEach(session => {
      if (session.globalSessionId) {
        const gid = session.globalSessionId;
        if (globalIdCounts[gid]) {
          globalIdCounts[gid]++;
          duplicateGlobalIds.push(gid);
        } else {
          globalIdCounts[gid] = 1;
          uniqueGlobalIds.add(gid);
        }
      }
    });

    console.log(`   唯一globalSessionId数量: ${uniqueGlobalIds.size}`);
    console.log(`   重复globalSessionId数量: ${duplicateGlobalIds.length}`);

    if (duplicateGlobalIds.length > 0) {
      console.log('   重复的globalSessionId:');
      duplicateGlobalIds.forEach(gid => {
        console.log(`     - ID ${gid}: 出现 ${globalIdCounts[gid]} 次`);
        sessions.filter(s => s.globalSessionId === gid).forEach(session => {
          console.log(`       * ${session._id} (courseId: ${session.courseId}, sessionNumber: ${session.sessionNumber})`);
        });
      });
    }

    // 验证三：检查sessionId格式和潜在冲突
    console.log('\n🔍 验证三：检查sessionId格式和潜在冲突');

    // 检查复合sessionId格式 (courseId-sessionNumber)
    const compositeSessions = sessions.filter(s => s._id.includes('-'));
    const nonCompositeSessions = sessions.filter(s => !s._id.includes('-'));

    console.log(`   复合格式sessionId: ${compositeSessions.length}`);
    console.log(`   非复合格式sessionId: ${nonCompositeSessions.length}`);

    if (nonCompositeSessions.length > 0) {
      console.log('   非复合格式的session:');
      nonCompositeSessions.forEach(session => {
        console.log(`     - ${session._id} (courseId: ${session.courseId}, sessionNumber: ${session.sessionNumber})`);
      });
    }

    // 检查课程内sessionNumber冲突
    console.log('\n🔍 验证四：检查课程内sessionNumber冲突');
    const courseSessionNumbers = {};

    sessions.forEach(session => {
      const courseId = session.courseId;
      const sessionNum = session.sessionNumber;

      if (!courseSessionNumbers[courseId]) {
        courseSessionNumbers[courseId] = new Set();
      }

      if (courseSessionNumbers[courseId].has(sessionNum)) {
        console.log(`   ⚠️  课程 ${courseId} 中sessionNumber ${sessionNum} 重复`);
      } else {
        courseSessionNumbers[courseId].add(sessionNum);
      }
    });

    // 统计每个课程的session数量
    const courseStats = {};
    sessions.forEach(session => {
      const courseId = session.courseId;
      if (!courseStats[courseId]) {
        courseStats[courseId] = 0;
      }
      courseStats[courseId]++;
    });

    console.log('\n📈 课程统计:');
    Object.entries(courseStats).forEach(([courseId, count]) => {
      console.log(`   课程 ${courseId}: ${count} 个session`);
    });

    // 最终验证结果
    console.log('\n🎯 最终验证结果:');
    const allValid =
      sessionsWithoutGlobalId === 0 &&
      duplicateGlobalIds.length === 0 &&
      nonCompositeSessions.length === 0;

    if (allValid) {
      console.log('   ✅ 所有验证通过！数据结构正确');
      console.log('   📋 全局Session ID范围: 1 -', Math.max(...Array.from(uniqueGlobalIds)));
    } else {
      console.log('   ❌ 发现数据问题，需要修复');
      if (sessionsWithoutGlobalId > 0) {
        console.log('     - 缺少globalSessionId的session');
      }
      if (duplicateGlobalIds.length > 0) {
        console.log('     - 重复的globalSessionId');
      }
      if (nonCompositeSessions.length > 0) {
        console.log('     - 非复合格式的sessionId');
      }
    }

    return allValid;

  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// 运行验证
validateGlobalSessionIds().then((isValid) => {
  console.log('\n🏁 数据验证完成');
  process.exit(isValid ? 0 : 1);
}).catch((error) => {
  console.error('\n💥 数据验证失败:', error);
  process.exit(1);
});
