"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.connectDB = void 0;
const mongoose_1 = require("mongoose");
// 自增序列表，用于为会话生成全局递增的数字ID
const counterSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    seq: { type: Number, default: 0 }
});
const CounterModel = mongoose_1.default.model('Counter', counterSchema);
async function getNextSequence(key) {
    const doc = await CounterModel.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return doc.seq;
}
// MongoDB 模型定义
const courseSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    teacherAddress: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const sessionSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    courseId: { type: String, required: true },
    sessionNumber: { type: Number, required: true }, // 课程内的课次序号，用于显示
    globalSessionId: { type: Number }, // 全局唯一的数字ID，用于区块链
    name: { type: String, required: true },
    description: { type: String, default: '' },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const attendanceRecordSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    sessionId: { type: String, required: true },
    studentAddress: { type: String, required: true },
    tokenId: { type: String },
    txHash: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    timestamp: { type: Date, default: Date.now }
});
const userSchema = new mongoose_1.default.Schema({
    address: { type: String, required: true, unique: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now }
});
// 模型
const CourseModel = mongoose_1.default.model('Course', courseSchema);
const SessionModel = mongoose_1.default.model('Session', sessionSchema);
const AttendanceRecordModel = mongoose_1.default.model('AttendanceRecord', attendanceRecordSchema);
const UserModel = mongoose_1.default.model('User', userSchema);
// Advanced Features Schemas
const certificateSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    studentAddress: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    tokenId: { type: String },
    txHash: { type: String },
    issuedAt: { type: Date, default: Date.now }
});
const studentWorkSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    studentAddress: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true }, // IPFS or local URL
    tokenId: { type: String },
    txHash: { type: String },
    isEndorsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const accessPassSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    studentAddress: { type: String, required: true },
    passType: { type: Number, required: true }, // 1=OfficeHour, 2=Lab, etc.
    amount: { type: Number, default: 1 },
    tokenId: { type: Number, required: true }, // ERC1155 Token ID - 现在是数字类型
    txHash: { type: String },
    isRedeemed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const studentPetSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    studentAddress: { type: String, required: true, unique: true },
    tokenId: { type: String },
    stage: { type: Number, default: 0 }, // 0=Seed, 1=Sprout, etc.
    experience: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});
// 点赞记录schema
const likeSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    workId: { type: String, required: true }, // 关联的作品ID
    userAddress: { type: String, required: true }, // 点赞用户地址
    createdAt: { type: Date, default: Date.now }
});
// 评论记录schema
const commentSchema = new mongoose_1.default.Schema({
    _id: { type: String },
    workId: { type: String, required: true }, // 关联的作品ID
    userAddress: { type: String, required: true }, // 评论用户地址
    content: { type: String, required: true }, // 评论内容
    createdAt: { type: Date, default: Date.now }
});
const CertificateModel = mongoose_1.default.model('Certificate', certificateSchema);
const StudentWorkModel = mongoose_1.default.model('StudentWork', studentWorkSchema);
const AccessPassModel = mongoose_1.default.model('AccessPass', accessPassSchema);
const StudentPetModel = mongoose_1.default.model('StudentPet', studentPetSchema);
const LikeModel = mongoose_1.default.model('Like', likeSchema);
const CommentModel = mongoose_1.default.model('Comment', commentSchema);
// 数据库连接
let isConnected = false;
async function connectDB() {
    if (isConnected)
        return;
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nft_attendance';
        await mongoose_1.default.connect(mongoURI);
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}
exports.connectDB = connectDB;
// 数据库类
class Database {
    async connect() {
        await connectDB();
    }
    // Course CRUD - MongoDB版本
    async createCourse(course) {
        await this.connect();
        const id = `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newCourse = await CourseModel.create({
            _id: id,
            ...course,
            teacherAddress: course.teacherAddress.toLowerCase(),
        });
        return {
            id: newCourse.id,
            name: newCourse.name,
            description: newCourse.description,
            teacherAddress: newCourse.teacherAddress,
            createdAt: newCourse.createdAt.getTime(),
            updatedAt: newCourse.updatedAt.getTime()
        };
    }
    async getCourse(id) {
        await this.connect();
        const course = await CourseModel.findOne({ _id: id });
        if (!course)
            return undefined;
        return {
            id: course.id,
            name: course.name,
            description: course.description,
            teacherAddress: course.teacherAddress,
            createdAt: course.createdAt.getTime(),
            updatedAt: course.updatedAt.getTime()
        };
    }
    async getCoursesByTeacher(teacherAddress) {
        await this.connect();
        // 使用不区分大小写的精确匹配，兼容历史数据大小写不一致
        const exactInsensitive = new RegExp(`^${teacherAddress}$`, 'i');
        const courses = await CourseModel.find({ teacherAddress: exactInsensitive });
        return courses.map(course => ({
            id: course.id,
            name: course.name,
            description: course.description,
            teacherAddress: course.teacherAddress,
            createdAt: course.createdAt.getTime(),
            updatedAt: course.updatedAt.getTime()
        }));
    }
    async getAllCourses() {
        await this.connect();
        const courses = await CourseModel.find();
        return courses.map(course => ({
            id: course.id,
            name: course.name,
            description: course.description,
            teacherAddress: course.teacherAddress,
            createdAt: course.createdAt.getTime(),
            updatedAt: course.updatedAt.getTime()
        }));
    }
    async updateCourse(id, updates) {
        await this.connect();
        const course = await CourseModel.findOneAndUpdate({ _id: id }, { ...updates, updatedAt: new Date() }, { new: true });
        if (!course)
            return undefined;
        return {
            id: course.id,
            name: course.name,
            description: course.description,
            teacherAddress: course.teacherAddress,
            createdAt: course.createdAt.getTime(),
            updatedAt: course.updatedAt.getTime()
        };
    }
    async deleteCourse(id) {
        await this.connect();
        const result = await CourseModel.deleteOne({ _id: id });
        return result.deletedCount > 0;
    }
    // Session CRUD - MongoDB版本
    async createSession(session) {
        await this.connect();
        // 为每个课程生成独立的递增sessionNumber（从1开始）
        // 查询该课程现有的最大sessionNumber，然后加1
        const existingSessions = await SessionModel.find({ courseId: session.courseId }).sort({ sessionNumber: -1 }).limit(1);
        const maxSessionNum = existingSessions.length > 0 ? Number(existingSessions[0]?.sessionNumber) || 0 : 0;
        const sessionNum = maxSessionNum + 1;
        // 生成全局唯一的数字ID用于区块链
        const globalSessionId = await getNextSequence('global_session');
        // 使用复合ID格式：courseId-sessionNum，保证全局唯一性
        const id = `${session.courseId}-${sessionNum}`;
        const newSession = await SessionModel.create({
            _id: id,
            courseId: session.courseId,
            sessionNumber: sessionNum,
            globalSessionId: globalSessionId, // 添加全局唯一ID
            name: session.name ?? `第${sessionNum}次课`,
            description: session.description ?? '',
            startTime: session.startTime,
            endTime: session.endTime,
        });
        const result = {
            id: newSession.id,
            courseId: newSession.courseId,
            sessionNumber: newSession.sessionNumber,
            name: newSession.name,
            startTime: newSession.startTime,
            endTime: newSession.endTime,
            createdAt: newSession.createdAt.getTime(),
            updatedAt: newSession.updatedAt.getTime()
        };
        // globalSessionId is guaranteed to exist since we just created it
        result.globalSessionId = globalSessionId;
        return result;
    }
    async getSession(id) {
        await this.connect();
        const session = await SessionModel.findOne({ _id: id });
        if (!session)
            return undefined;
        const result = {
            id: session.id,
            courseId: session.courseId,
            sessionNumber: session.sessionNumber,
            name: session.name,
            startTime: session.startTime,
            endTime: session.endTime,
            createdAt: session.createdAt.getTime(),
            updatedAt: session.updatedAt.getTime()
        };
        // Conditionally include globalSessionId only when it exists
        if (session.globalSessionId !== undefined) {
            result.globalSessionId = session.globalSessionId;
        }
        return result;
    }
    async getSessionsByCourse(courseId) {
        await this.connect();
        const sessions = await SessionModel.find({ courseId });
        return sessions.map(session => {
            const result = {
                id: session.id,
                courseId: session.courseId,
                sessionNumber: session.sessionNumber,
                name: session.name,
                startTime: session.startTime,
                endTime: session.endTime,
                createdAt: session.createdAt.getTime(),
                updatedAt: session.updatedAt.getTime()
            };
            // Conditionally include globalSessionId only when it exists
            if (session.globalSessionId !== undefined) {
                result.globalSessionId = session.globalSessionId;
            }
            return result;
        });
    }
    async updateSession(id, updates) {
        await this.connect();
        const session = await SessionModel.findOneAndUpdate({ _id: id }, { ...updates }, { new: true });
        if (!session)
            return undefined;
        return {
            id: session.id,
            courseId: session.courseId,
            sessionNumber: session.sessionNumber,
            name: session.name,
            startTime: session.startTime,
            endTime: session.endTime,
            createdAt: session.createdAt.getTime(),
            updatedAt: session.updatedAt.getTime()
        };
    }
    async deleteSession(id) {
        await this.connect();
        const result = await SessionModel.deleteOne({ _id: id });
        return result.deletedCount > 0;
    }
    // Attendance Records - MongoDB版本
    async createAttendanceRecord(record) {
        await this.connect();
        const id = `attendance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newRecord = await AttendanceRecordModel.create({
            _id: id,
            ...record,
            studentAddress: record.studentAddress.toLowerCase(),
        });
        const result = {
            id: newRecord.id,
            sessionId: newRecord.sessionId,
            studentAddress: newRecord.studentAddress,
            status: newRecord.status,
            timestamp: newRecord.timestamp.getTime()
        };
        if (newRecord.tokenId)
            result.tokenId = newRecord.tokenId;
        if (newRecord.txHash)
            result.txHash = newRecord.txHash;
        return result;
    }
    async getAttendanceRecordByStudentAndSession(studentAddress, sessionId) {
        await this.connect();
        const record = await AttendanceRecordModel.findOne({
            studentAddress: studentAddress.toLowerCase(),
            sessionId: sessionId
        });
        if (!record)
            return undefined;
        const result = {
            id: record.id,
            sessionId: record.sessionId,
            studentAddress: record.studentAddress,
            status: record.status,
            timestamp: record.timestamp.getTime()
        };
        if (record.tokenId)
            result.tokenId = record.tokenId;
        if (record.txHash)
            result.txHash = record.txHash;
        return result;
    }
    async getAttendanceRecord(id) {
        await this.connect();
        const record = await AttendanceRecordModel.findOne({ _id: id });
        if (!record)
            return undefined;
        const result = {
            id: record.id,
            sessionId: record.sessionId,
            studentAddress: record.studentAddress,
            status: record.status,
            timestamp: record.timestamp.getTime()
        };
        if (record.tokenId)
            result.tokenId = record.tokenId;
        if (record.txHash)
            result.txHash = record.txHash;
        return result;
    }
    async getAttendanceBySession(sessionId) {
        await this.connect();
        const records = await AttendanceRecordModel.find({ sessionId });
        return records.map(record => {
            const result = {
                id: record.id,
                sessionId: record.sessionId,
                studentAddress: record.studentAddress,
                status: record.status,
                timestamp: record.timestamp.getTime()
            };
            if (record.tokenId)
                result.tokenId = record.tokenId;
            if (record.txHash)
                result.txHash = record.txHash;
            return result;
        });
    }
    async getAttendanceByStudent(studentAddress) {
        await this.connect();
        const records = await AttendanceRecordModel.find({ studentAddress: studentAddress.toLowerCase() });
        return records.map(record => {
            const result = {
                id: record.id,
                sessionId: record.sessionId,
                studentAddress: record.studentAddress,
                status: record.status,
                timestamp: record.timestamp.getTime()
            };
            if (record.tokenId)
                result.tokenId = record.tokenId;
            if (record.txHash)
                result.txHash = record.txHash;
            return result;
        });
    }
    // User Management - MongoDB版本
    async createUser(user) {
        await this.connect();
        // 统一以小写地址存储，避免大小写导致的唯一索引冲突
        const newUser = await UserModel.create({
            ...user,
            address: user.address.toLowerCase()
        });
        return {
            address: newUser.address,
            role: newUser.role,
            createdAt: newUser.createdAt.getTime(),
            lastLoginAt: newUser.lastLoginAt?.getTime()
        };
    }
    async getUser(address) {
        await this.connect();
        const user = await UserModel.findOne({ address: address.toLowerCase() });
        if (!user)
            return undefined;
        return {
            address: user.address,
            role: user.role,
            createdAt: user.createdAt.getTime(),
            lastLoginAt: user.lastLoginAt?.getTime()
        };
    }
    async updateUser(address, updates) {
        await this.connect();
        const user = await UserModel.findOneAndUpdate({ address: address.toLowerCase() }, { ...updates, lastLoginAt: new Date() }, { new: true });
        if (!user)
            return undefined;
        return {
            address: user.address,
            role: user.role,
            createdAt: user.createdAt.getTime(),
            lastLoginAt: user.lastLoginAt?.getTime()
        };
    }
    // Statistics - MongoDB版本
    async getSessionStats(sessionId) {
        await this.connect();
        const stats = await AttendanceRecordModel.aggregate([
            { $match: { sessionId: sessionId } },
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    presentCount: {
                        $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
                    },
                    absentCount: {
                        $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
                    },
                    lateCount: {
                        $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] }
                    }
                }
            }
        ]);
        const result = stats[0] || {
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
        };
        const attendanceRate = result.totalStudents > 0
            ? (result.presentCount / result.totalStudents) * 100
            : 0;
        return {
            sessionId,
            totalStudents: result.totalStudents,
            presentCount: result.presentCount,
            absentCount: result.absentCount,
            lateCount: result.lateCount,
            attendanceRate
        };
    }
    async getCourseStats(courseId) {
        await this.connect();
        const sessions = await this.getSessionsByCourse(courseId);
        const sessionIds = sessions.map(s => s.id);
        if (sessionIds.length === 0) {
            return {
                courseId,
                totalSessions: 0,
                totalAttendance: 0,
                averageAttendanceRate: 0
            };
        }
        const stats = await AttendanceRecordModel.aggregate([
            { $match: { sessionId: { $in: sessionIds } } },
            {
                $group: {
                    _id: null,
                    totalAttendance: {
                        $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
                    },
                    totalRecords: { $sum: 1 }
                }
            }
        ]);
        const result = stats[0] || { totalAttendance: 0, totalRecords: 0 };
        // Calculate average attendance rate based on total possible attendance (sum of all session students)
        // Note: This assumes totalRecords represents the total possible attendance slots filled.
        // If we want "average of session rates", we'd need a different aggregation.
        // But "Total Attendance / Total Possible" is usually a better metric for the course.
        const averageAttendanceRate = result.totalRecords > 0
            ? (result.totalAttendance / result.totalRecords) * 100
            : 0;
        return {
            courseId,
            totalSessions: sessions.length,
            totalAttendance: result.totalAttendance,
            averageAttendanceRate
        };
    }
    // 获取所有出勤记录
    async getAllAttendanceRecords() {
        await this.connect();
        const records = await AttendanceRecordModel.find();
        return records.map(record => {
            const result = {
                id: record.id,
                sessionId: record.sessionId,
                studentAddress: record.studentAddress,
                status: record.status,
                timestamp: record.timestamp.getTime()
            };
            if (record.tokenId)
                result.tokenId = record.tokenId;
            if (record.txHash)
                result.txHash = record.txHash;
            return result;
        });
    }
    // 获取所有会话
    async getAllSessions() {
        await this.connect();
        const sessions = await SessionModel.find();
        return sessions.map(session => {
            const result = {
                id: session.id,
                courseId: session.courseId,
                sessionNumber: session.sessionNumber,
                name: session.name,
                startTime: session.startTime,
                endTime: session.endTime,
                createdAt: session.createdAt.getTime(),
                updatedAt: session.updatedAt.getTime()
            };
            // Conditionally include globalSessionId only when it exists
            if (session.globalSessionId !== undefined) {
                result.globalSessionId = session.globalSessionId;
            }
            return result;
        });
    }
    // 数据完整性检查 - 确保所有session都有globalSessionId
    async validateSessionIntegrity() {
        await this.connect();
        const sessions = await SessionModel.find();
        const issues = [];
        let sessionsWithoutGlobalId = 0;
        const globalIdSet = new Set();
        for (const session of sessions) {
            if (!session.globalSessionId) {
                sessionsWithoutGlobalId++;
                issues.push(`Session ${session._id} 缺少globalSessionId`);
            }
            else {
                if (globalIdSet.has(session.globalSessionId)) {
                    issues.push(`globalSessionId ${session.globalSessionId} 重复使用`);
                }
                else {
                    globalIdSet.add(session.globalSessionId);
                }
            }
        }
        const isValid = issues.length === 0;
        return { isValid, issues };
    }
    // Advanced Features CRUD
    // Certificates
    async createCertificate(data) {
        await this.connect();
        const id = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return await CertificateModel.create({ _id: id, ...data });
    }
    async getCertificatesByStudent(studentAddress) {
        await this.connect();
        // 使用不区分大小写的正则表达式查询，以兼容大小写不同的地址格式
        return await CertificateModel.find({
            studentAddress: new RegExp(`^${studentAddress}$`, 'i')
        });
    }
    // Student Work
    async createStudentWork(data) {
        await this.connect();
        const id = `work_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return await StudentWorkModel.create({ _id: id, ...data });
    }
    async getStudentWorks(studentAddress) {
        await this.connect();
        const query = studentAddress ? { studentAddress: new RegExp(`^${studentAddress}$`, 'i') } : {};
        return await StudentWorkModel.find(query);
    }
    async endorseStudentWork(id) {
        await this.connect();
        return await StudentWorkModel.findByIdAndUpdate(id, { isEndorsed: true }, { new: true });
    }
    // Access Passes
    async createAccessPass(data) {
        await this.connect();
        const id = `pass_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return await AccessPassModel.create({ _id: id, ...data });
    }
    async getAccessPasses(studentAddress) {
        await this.connect();
        return await AccessPassModel.find({ studentAddress: new RegExp(`^${studentAddress}$`, 'i') });
    }
    async redeemAccessPass(id) {
        await this.connect();
        return await AccessPassModel.findByIdAndUpdate(id, { isRedeemed: true }, { new: true });
    }
    // Student Pet
    async getStudentPet(studentAddress) {
        await this.connect();
        return await StudentPetModel.findOne({ studentAddress: new RegExp(`^${studentAddress}$`, 'i') });
    }
    async createOrUpdateStudentPet(studentAddress, data) {
        await this.connect();
        const existing = await StudentPetModel.findOne({ studentAddress: new RegExp(`^${studentAddress}$`, 'i') });
        if (existing) {
            return await StudentPetModel.findByIdAndUpdate(existing._id, data, { new: true });
        }
        else {
            const id = `pet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            return await StudentPetModel.create({ _id: id, studentAddress: studentAddress.toLowerCase(), ...data });
        }
    }
    // Likes and Comments
    async addLike(workId, userAddress) {
        await this.connect();
        const id = `like_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return await LikeModel.create({
            _id: id,
            workId,
            userAddress: userAddress.toLowerCase()
        });
    }
    async removeLike(workId, userAddress) {
        await this.connect();
        return await LikeModel.findOneAndDelete({
            workId,
            userAddress: new RegExp(`^${userAddress}$`, 'i')
        });
    }
    async hasLiked(workId, userAddress) {
        await this.connect();
        const like = await LikeModel.findOne({
            workId,
            userAddress: new RegExp(`^${userAddress}$`, 'i')
        });
        return !!like;
    }
    async getLikesCount(workId) {
        await this.connect();
        return await LikeModel.countDocuments({ workId });
    }
    async addComment(workId, userAddress, content) {
        await this.connect();
        const id = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return await CommentModel.create({
            _id: id,
            workId,
            userAddress: userAddress.toLowerCase(),
            content
        });
    }
    async getComments(workId) {
        await this.connect();
        return await CommentModel.find({ workId }).sort({ createdAt: -1 });
    }
    async getGalleryWorks() {
        await this.connect();
        const works = await StudentWorkModel.find().sort({ createdAt: -1 });
        // 为每个作品添加点赞数和评论数
        const worksWithStats = await Promise.all(works.map(async (work) => {
            const likesCount = await this.getLikesCount(work._id);
            const commentsCount = await CommentModel.countDocuments({ workId: work._id });
            return {
                ...work.toObject(),
                likesCount,
                commentsCount
            };
        }));
        return worksWithStats;
    }
}
exports.db = new Database();
//# sourceMappingURL=database.js.map