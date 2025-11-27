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

async function checkExistingSessions() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');

    // 查询所有session
    const sessions = await SessionModel.find();
    console.log(`📊 找到 ${sessions.length} 个session记录`);

    let withGlobalId = 0;
    let withoutGlobalId = 0;

    sessions.forEach(session => {
      if (session.globalSessionId) {
        withGlobalId++;
        console.log(`✅ Session ${session._id}: globalSessionId = ${session.globalSessionId}`);
      } else {
        withoutGlobalId++;
        console.log(`❌ Session ${session._id}: 缺少globalSessionId`);
      }
    });

    console.log(`\n📈 统计结果:`);
    console.log(`   有globalSessionId: ${withGlobalId}`);
    console.log(`   缺少globalSessionId: ${withoutGlobalId}`);

    if (withoutGlobalId > 0) {
      console.log(`\n⚠️ 需要为 ${withoutGlobalId} 个session分配globalSessionId`);
    } else {
      console.log(`\n🎉 所有session都已分配globalSessionId！`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkExistingSessions();
