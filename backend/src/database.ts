import type { Course, Session, AttendanceRecord, User, AttendanceStats, CourseStats } from './types';

// 内存数据库（MVP版本，后续可替换为MongoDB）
class Database {
  private courses: Map<string, Course> = new Map();
  private sessions: Map<string, Session> = new Map();
  private attendanceRecords: Map<string, AttendanceRecord> = new Map();
  private users: Map<string, User> = new Map();

  // Course CRUD
  createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Course {
    const id = `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const newCourse: Course = {
      ...course,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  getCourse(id: string): Course | undefined {
    return this.courses.get(id);
  }

  getCoursesByTeacher(teacherAddress: string): Course[] {
    return Array.from(this.courses.values())
      .filter(course => course.teacherAddress.toLowerCase() === teacherAddress.toLowerCase());
  }

  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  updateCourse(id: string, updates: Partial<Omit<Course, 'id' | 'createdAt' | 'teacherAddress'>>): Course | undefined {
    const course = this.courses.get(id);
    if (!course) return undefined;

    const updatedCourse = {
      ...course,
      ...updates,
      updatedAt: Date.now()
    };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  deleteCourse(id: string): boolean {
    return this.courses.delete(id);
  }

  // Session CRUD
  createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Session {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const newSession: Session = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getSessionsByCourse(courseId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => session.courseId === courseId);
  }

  updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'createdAt' | 'courseId'>>): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: Date.now()
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  // Attendance Records
  createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): AttendanceRecord {
    const id = `attendance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newRecord: AttendanceRecord = {
      ...record,
      id,
      timestamp: Date.now()
    };
    this.attendanceRecords.set(id, newRecord);
    return newRecord;
  }

  getAttendanceRecord(id: string): AttendanceRecord | undefined {
    return this.attendanceRecords.get(id);
  }

  getAttendanceBySession(sessionId: string): AttendanceRecord[] {
    return Array.from(this.attendanceRecords.values())
      .filter(record => record.sessionId === sessionId);
  }

  getAttendanceByStudent(studentAddress: string): AttendanceRecord[] {
    return Array.from(this.attendanceRecords.values())
      .filter(record => record.studentAddress.toLowerCase() === studentAddress.toLowerCase());
  }

  // User Management
  createUser(user: Omit<User, 'createdAt'>): User {
    const now = Date.now();
    const newUser: User = {
      ...user,
      createdAt: now
    };
    this.users.set(user.address.toLowerCase(), newUser);
    return newUser;
  }

  getUser(address: string): User | undefined {
    return this.users.get(address.toLowerCase());
  }

  updateUser(address: string, updates: Partial<Omit<User, 'address' | 'createdAt'>>): User | undefined {
    const user = this.users.get(address.toLowerCase());
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...updates,
      lastLoginAt: Date.now()
    };
    this.users.set(address.toLowerCase(), updatedUser);
    return updatedUser;
  }

  // Statistics
  getSessionStats(sessionId: string): AttendanceStats {
    const records = this.getAttendanceBySession(sessionId);
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

  getCourseStats(courseId: string): CourseStats {
    const sessions = this.getSessionsByCourse(courseId);
    const totalSessions = sessions.length;
    let totalAttendance = 0;
    let totalPossibleAttendance = 0;

    sessions.forEach(session => {
      const stats = this.getSessionStats(session.id);
      totalAttendance += stats.presentCount;
      totalPossibleAttendance += stats.totalStudents;
    });

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
}

export const db = new Database();
