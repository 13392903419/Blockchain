export interface Course {
    id: string;
    name: string;
    description?: string;
    teacherAddress: string;
    createdAt: number;
    updatedAt: number;
}
export interface Session {
    id: string;
    courseId: string;
    sessionNumber: number;
    globalSessionId?: number;
    name: string;
    description?: string;
    startTime: number;
    endTime: number;
    createdAt: number;
    updatedAt: number;
}
export interface AttendanceRecord {
    id: string;
    sessionId: string;
    studentAddress: string;
    tokenId?: string;
    txHash?: string;
    timestamp: number;
    status: 'present' | 'absent' | 'late';
}
export interface User {
    address: string;
    role: 'teacher' | 'student';
    name?: string;
    email?: string;
    createdAt: number;
    lastLoginAt?: number;
}
export interface AttendanceStats {
    sessionId: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
}
export interface CourseStats {
    courseId: string;
    totalSessions: number;
    totalAttendance: number;
    averageAttendanceRate: number;
}
//# sourceMappingURL=types.d.ts.map