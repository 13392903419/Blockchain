import mongoose from 'mongoose';
import type { Course, Session, AttendanceRecord, User, AttendanceStats, CourseStats } from './types';
// 自增序列表，用于为会话生成全局递增的数字ID
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 }
});
const CounterModel = mongoose.model('Counter', counterSchema);

async function getNextSequence(key: string): Promise<number> {
  const doc = await CounterModel.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc!.seq;
}

// MongoDB 模型定义
const courseSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  teacherAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  courseId: { type: String, required: true },
  sessionNumber: { type: Number, required: true }, // 课程内的课次序号，用于显示
  name: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const attendanceRecordSchema = new mongoose.Schema({
  _id: { type: String },
  sessionId: { type: String, required: true },
  studentAddress: { type: String, required: true },
  tokenId: { type: String },
  txHash: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], default: 'present' },
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  role: { type: String, enum: ['teacher', 'student'], required: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

// 模型
const CourseModel = mongoose.model('Course', courseSchema);
const SessionModel = mongoose.model('Session', sessionSchema);
const AttendanceRecordModel = mongoose.model('AttendanceRecord', attendanceRecordSchema);
const UserModel = mongoose.model('User', userSchema);

// 数据库连接
let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nft_attendance';
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// 数据库类
class Database {
  async connect() {
    await connectDB();
  }

  // Course CRUD - MongoDB版本
  async createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
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

  async getCourse(id: string): Promise<Course | undefined> {
    await this.connect();
    const course = await CourseModel.findOne({ _id: id });
    if (!course) return undefined;

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      teacherAddress: course.teacherAddress,
      createdAt: course.createdAt.getTime(),
      updatedAt: course.updatedAt.getTime()
    };
  }

  async getCoursesByTeacher(teacherAddress: string): Promise<Course[]> {
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

  async getAllCourses(): Promise<Course[]> {
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

  async updateCourse(id: string, updates: Partial<Omit<Course, 'id' | 'createdAt' | 'teacherAddress'>>): Promise<Course | undefined> {
    await this.connect();
    const course = await CourseModel.findOneAndUpdate(
      { _id: id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!course) return undefined;

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      teacherAddress: course.teacherAddress,
      createdAt: course.createdAt.getTime(),
      updatedAt: course.updatedAt.getTime()
    };
  }

  async deleteCourse(id: string): Promise<boolean> {
    await this.connect();
    const result = await CourseModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Session CRUD - MongoDB版本
  async createSession(session: Partial<Omit<Session, 'id' | 'createdAt'>> & { courseId: string; startTime: number; endTime: number }): Promise<Session> {
    await this.connect();
    // 为每个课程生成独立的递增sessionNumber（从1开始）
    // 查询该课程现有的最大sessionNumber，然后加1
    const existingSessions = await SessionModel.find({ courseId: session.courseId }).sort({ sessionNumber: -1 }).limit(1);
    const maxSessionNum = existingSessions.length > 0 ? Number(existingSessions[0].sessionNumber) || 0 : 0;
    const sessionNum = maxSessionNum + 1;

    // 使用复合ID格式：courseId-sessionNum，保证全局唯一性
    const id = `${session.courseId}-${sessionNum}`;

    const newSession = await SessionModel.create({
      _id: id,
      courseId: session.courseId,
      sessionNumber: sessionNum,
      name: session.name ?? `第${sessionNum}次课`,
      description: session.description ?? '',
      startTime: session.startTime,
      endTime: session.endTime,
    });

    return {
      id: newSession.id,
      courseId: newSession.courseId,
      sessionNumber: newSession.sessionNumber,
      name: newSession.name,
      startTime: newSession.startTime,
      endTime: newSession.endTime,
      createdAt: newSession.createdAt.getTime(),
      updatedAt: newSession.updatedAt.getTime()
    };
  }

  async getSession(id: string): Promise<Session | undefined> {
    await this.connect();
    const session = await SessionModel.findOne({ _id: id });
    if (!session) return undefined;

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

  async getSessionsByCourse(courseId: string): Promise<Session[]> {
    await this.connect();
    const sessions = await SessionModel.find({ courseId });

    return sessions.map(session => ({
      id: session.id,
      courseId: session.courseId,
      sessionNumber: session.sessionNumber,
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime()
    }));
  }

  async updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'createdAt' | 'courseId'>>): Promise<Session | undefined> {
    await this.connect();
    const session = await SessionModel.findOneAndUpdate(
      { _id: id },
      { ...updates },
      { new: true }
    );

    if (!session) return undefined;

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

  async deleteSession(id: string): Promise<boolean> {
    await this.connect();
    const result = await SessionModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Attendance Records - MongoDB版本
  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<AttendanceRecord> {
    await this.connect();
    const id = `attendance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newRecord = await AttendanceRecordModel.create({
      _id: id,
      ...record,
      studentAddress: record.studentAddress.toLowerCase(),
    });

    const result: AttendanceRecord = {
      id: newRecord.id,
      sessionId: newRecord.sessionId,
      studentAddress: newRecord.studentAddress,
      status: newRecord.status,
      timestamp: newRecord.timestamp.getTime()
    };

    if (newRecord.tokenId) result.tokenId = newRecord.tokenId;
    if (newRecord.txHash) result.txHash = newRecord.txHash;

    return result;
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    await this.connect();
    const record = await AttendanceRecordModel.findOne({ _id: id });
    if (!record) return undefined;

    const result: AttendanceRecord = {
      id: record.id,
      sessionId: record.sessionId,
      studentAddress: record.studentAddress,
      status: record.status,
      timestamp: record.timestamp.getTime()
    };

    if (record.tokenId) result.tokenId = record.tokenId;
    if (record.txHash) result.txHash = record.txHash;

    return result;
  }

  async getAttendanceBySession(sessionId: string): Promise<AttendanceRecord[]> {
    await this.connect();
    const records = await AttendanceRecordModel.find({ sessionId });

    return records.map(record => {
      const result: AttendanceRecord = {
        id: record.id,
        sessionId: record.sessionId,
        studentAddress: record.studentAddress,
        status: record.status,
        timestamp: record.timestamp.getTime()
      };

      if (record.tokenId) result.tokenId = record.tokenId;
      if (record.txHash) result.txHash = record.txHash;

      return result;
    });
  }

  async getAttendanceByStudent(studentAddress: string): Promise<AttendanceRecord[]> {
    await this.connect();
    const records = await AttendanceRecordModel.find({ studentAddress: studentAddress.toLowerCase() });

    return records.map(record => {
      const result: AttendanceRecord = {
        id: record.id,
        sessionId: record.sessionId,
        studentAddress: record.studentAddress,
        status: record.status,
        timestamp: record.timestamp.getTime()
      };

      if (record.tokenId) result.tokenId = record.tokenId;
      if (record.txHash) result.txHash = record.txHash;

      return result;
    });
  }

  // User Management - MongoDB版本
  async createUser(user: Omit<User, 'createdAt'>): Promise<User> {
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

  async getUser(address: string): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findOne({ address: address.toLowerCase() });
    if (!user) return undefined;

    return {
      address: user.address,
      role: user.role,
      createdAt: user.createdAt.getTime(),
      lastLoginAt: user.lastLoginAt?.getTime()
    };
  }

  async updateUser(address: string, updates: Partial<Omit<User, 'address' | 'createdAt'>>): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findOneAndUpdate(
      { address: address.toLowerCase() },
      { ...updates, lastLoginAt: new Date() },
      { new: true }
    );

    if (!user) return undefined;

    return {
      address: user.address,
      role: user.role,
      createdAt: user.createdAt.getTime(),
      lastLoginAt: user.lastLoginAt?.getTime()
    };
  }

  // Statistics - MongoDB版本
  async getSessionStats(sessionId: string): Promise<AttendanceStats> {
    const records = await this.getAttendanceBySession(sessionId);
    const totalStudents = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

    return {
      sessionId,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate
    };
  }

  async getCourseStats(courseId: string): Promise<CourseStats> {
    const sessions = await this.getSessionsByCourse(courseId);
    const totalSessions = sessions.length;
    let totalAttendance = 0;
    let totalPossibleAttendance = 0;

    for (const session of sessions) {
      const stats = await this.getSessionStats(session.id);
      totalAttendance += stats.presentCount;
      totalPossibleAttendance += stats.totalStudents;
    }

    const averageAttendanceRate = totalPossibleAttendance > 0
      ? (totalAttendance / totalPossibleAttendance) * 100
      : 0;

    return {
      courseId,
      totalSessions,
      totalAttendance,
      averageAttendanceRate
    };
  }

  // 获取所有出勤记录
  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    await this.connect();
    const records = await AttendanceRecordModel.find();

    return records.map(record => {
      const result: AttendanceRecord = {
        id: record.id,
        sessionId: record.sessionId,
        studentAddress: record.studentAddress,
        status: record.status,
        timestamp: record.timestamp.getTime()
      };

      if (record.tokenId) result.tokenId = record.tokenId;
      if (record.txHash) result.txHash = record.txHash;

      return result;
    });
  }

  // 获取所有会话
  async getAllSessions(): Promise<Session[]> {
    await this.connect();
    const sessions = await SessionModel.find();

    return sessions.map(session => ({
      id: session.id,
      courseId: session.courseId,
      sessionNumber: session.sessionNumber,
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime()
    }));
  }
}

export const db = new Database();
