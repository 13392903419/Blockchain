const mongoose = require('mongoose');

// MongoDB 连接
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nft_attendance';

// 自增序列表，用于为会话生成全局递增的数字ID
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 }
});
const CounterModel = mongoose.model('Counter', counterSchema);

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

async function getNextSequence(key) {
  const doc = await CounterModel.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

async function migrateGlobalSessionIds() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');

    // 查找所有缺少globalSessionId的session
    const sessionsWithoutGlobalId = await SessionModel.find({
      $or: [
        { globalSessionId: { $exists: false } },
        { globalSessionId: null }
      ]
    });

    console.log(`📊 找到 ${sessionsWithoutGlobalId.length} 个需要分配globalSessionId的session`);

    if (sessionsWithoutGlobalId.length === 0) {
      console.log('🎉 所有session都已分配globalSessionId，无需迁移');
      return;
    }

    // 为每个session分配globalSessionId
    for (const session of sessionsWithoutGlobalId) {
      const globalSessionId = await getNextSequence('global_session');

      await SessionModel.findByIdAndUpdate(
        session._id,
        {
          globalSessionId: globalSessionId,
          updatedAt: new Date()
        },
        { new: true }
      );

      console.log(`✅ 为session ${session._id} (courseId: ${session.courseId}, sessionNumber: ${session.sessionNumber}) 分配globalSessionId: ${globalSessionId}`);
    }

    console.log(`\n🎉 成功为 ${sessionsWithoutGlobalId.length} 个session分配了globalSessionId`);

    // 验证迁移结果
    const allSessions = await SessionModel.find();
    console.log(`\n📈 迁移后统计:`);
    let withGlobalId = 0;
    let withoutGlobalId = 0;

    allSessions.forEach(session => {
      if (session.globalSessionId) {
        withGlobalId++;
      } else {
        withoutGlobalId++;
      }
    });

    console.log(`   有globalSessionId: ${withGlobalId}`);
    console.log(`   缺少globalSessionId: ${withoutGlobalId}`);

    if (withoutGlobalId === 0) {
      console.log(`\n🎯 数据迁移完成！所有session都已分配globalSessionId`);
    } else {
      console.log(`\n⚠️ 还有 ${withoutGlobalId} 个session未分配globalSessionId`);
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// 运行迁移
migrateGlobalSessionIds().then(() => {
  console.log('\n🏁 迁移脚本执行完毕');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 迁移脚本执行失败:', error);
  process.exit(1);
});
