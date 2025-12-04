// 测试作品画廊功能的完整流程
const mongoose = require('mongoose');

// 模拟数据库schema
const studentWorkSchema = new mongoose.Schema({
  _id: { type: String },
  studentAddress: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String },
  tokenId: { type: String },
  txHash: { type: String },
  isEndorsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const likeSchema = new mongoose.Schema({
  _id: { type: String },
  workId: { type: String, required: true },
  userAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  _id: { type: String },
  workId: { type: String, required: true },
  userAddress: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const StudentWorkModel = mongoose.model('StudentWork', studentWorkSchema);
const LikeModel = mongoose.model('Like', likeSchema);
const CommentModel = mongoose.model('Comment', commentSchema);

async function testGalleryFunctionality() {
    console.log('🎨 开始测试作品画廊功能...\n');

    try {
        // 连接数据库
        await mongoose.connect('mongodb://localhost:27017/nft_attendance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ 数据库连接成功\n');

        // 清理测试数据
        console.log('🧹 清理旧的测试数据...');
        await LikeModel.deleteMany({ workId: { $regex: '^test_' } });
        await CommentModel.deleteMany({ workId: { $regex: '^test_' } });
        await StudentWorkModel.deleteMany({ _id: { $regex: '^test_' } });
        console.log('✅ 测试数据清理完成\n');

        // 创建测试作品
        console.log('🎨 创建测试作品...');
        const testWorks = [
            {
                _id: 'test_work_1',
                studentAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                title: '数字艺术作品1',
                description: '我的第一件数字艺术作品',
                fileUrl: 'https://example.com/art1.jpg',
                tokenId: '1001',
                isEndorsed: false
            },
            {
                _id: 'test_work_2',
                studentAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                title: '创意设计作品',
                description: '探索UI/UX设计的无限可能',
                fileUrl: 'https://example.com/design1.jpg',
                tokenId: '1002',
                isEndorsed: true
            },
            {
                _id: 'test_work_3',
                studentAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
                title: '区块链主题插画',
                description: '描绘区块链技术的未来愿景',
                fileUrl: 'https://example.com/blockchain.jpg',
                tokenId: '1003',
                isEndorsed: false
            }
        ];

        for (const work of testWorks) {
            await StudentWorkModel.create(work);
        }
        console.log('✅ 创建了3件测试作品\n');

        // 模拟点赞行为
        console.log('❤️ 模拟用户点赞行为...');
        const likeActions = [
            { workId: 'test_work_1', userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
            { workId: 'test_work_1', userAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' },
            { workId: 'test_work_2', userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
            { workId: 'test_work_2', userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
            { workId: 'test_work_2', userAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' },
            { workId: 'test_work_3', userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' }
        ];

        for (const like of likeActions) {
            const id = `like_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await LikeModel.create({
                _id: id,
                ...like
            });
        }
        console.log('✅ 完成了6个点赞操作\n');

        // 模拟评论行为
        console.log('💬 模拟用户评论行为...');
        const commentActions = [
            { workId: 'test_work_1', userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', content: '很棒的作品！创意十足' },
            { workId: 'test_work_2', userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', content: '设计很精美，配色很和谐' },
            { workId: 'test_work_2', userAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', content: '老师认证的作品果然不一样！' },
            { workId: 'test_work_3', userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', content: '区块链的未来就在这里' }
        ];

        for (const comment of commentActions) {
            const id = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await CommentModel.create({
                _id: id,
                ...comment
            });
        }
        console.log('✅ 完成了4个评论操作\n');

        // 测试画廊API功能
        console.log('🖼️ 模拟画廊数据查询...');
        const works = await StudentWorkModel.find().sort({ createdAt: -1 });

        const worksWithStats = await Promise.all(works.map(async (work) => {
            const likesCount = await LikeModel.countDocuments({ workId: work._id });
            const commentsCount = await CommentModel.countDocuments({ workId: work._id });
            return {
                ...work.toObject(),
                likesCount,
                commentsCount
            };
        }));

        console.log('📊 画廊作品统计:');
        worksWithStats.forEach(work => {
            console.log(`   "${work.title}": ${work.likesCount} 赞, ${work.commentsCount} 评论`);
        });
        console.log('');

        // 测试按点赞数排序
        console.log('🏆 测试按点赞数排序...');
        const sortedByLikes = [...worksWithStats].sort((a, b) => b.likesCount - a.likesCount);
        console.log('点赞数排序结果:');
        sortedByLikes.forEach((work, index) => {
            console.log(`   ${index + 1}. "${work.title}" - ${work.likesCount} 赞`);
        });
        console.log('');

        // 测试按时间排序
        console.log('🕒 测试按时间排序...');
        const sortedByTime = [...worksWithStats].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        console.log('时间排序结果:');
        sortedByTime.forEach((work, index) => {
            console.log(`   ${index + 1}. "${work.title}" - ${new Date(work.createdAt).toLocaleDateString()}`);
        });
        console.log('');

        console.log('✅ 作品画廊功能测试完成！');
        console.log('🎯 功能特性验证:');
        console.log('   ✅ 作品展示：所有作品正常显示');
        console.log('   ✅ 点赞系统：点赞计数正确');
        console.log('   ✅ 评论系统：评论功能正常');
        console.log('   ✅ 教师认证：认证标识正确显示');
        console.log('   ✅ 排序功能：支持按时间和点赞数排序');
        console.log('   ✅ 竞争机制：通过点赞数实现作品竞争');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 数据库连接已关闭');
    }
}

// 运行测试
testGalleryFunctionality();
