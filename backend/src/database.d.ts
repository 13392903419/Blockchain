/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
import mongoose from 'mongoose';
import type { Course, Session, AttendanceRecord, User, AttendanceStats, CourseStats } from './types';
export declare function connectDB(): Promise<void>;
declare class Database {
    connect(): Promise<void>;
    createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course>;
    getCourse(id: string): Promise<Course | undefined>;
    getCoursesByTeacher(teacherAddress: string): Promise<Course[]>;
    getAllCourses(): Promise<Course[]>;
    updateCourse(id: string, updates: Partial<Omit<Course, 'id' | 'createdAt' | 'teacherAddress'>>): Promise<Course | undefined>;
    deleteCourse(id: string): Promise<boolean>;
    createSession(session: Partial<Omit<Session, 'id' | 'createdAt'>> & {
        courseId: string;
        startTime: number;
        endTime: number;
    }): Promise<Session>;
    getSession(id: string): Promise<Session | undefined>;
    getSessionsByCourse(courseId: string): Promise<Session[]>;
    updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'createdAt' | 'courseId'>>): Promise<Session | undefined>;
    deleteSession(id: string): Promise<boolean>;
    createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<AttendanceRecord>;
    getAttendanceRecordByStudentAndSession(studentAddress: string, sessionId: string): Promise<AttendanceRecord | undefined>;
    getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined>;
    getAttendanceBySession(sessionId: string): Promise<AttendanceRecord[]>;
    getAttendanceByStudent(studentAddress: string): Promise<AttendanceRecord[]>;
    createUser(user: Omit<User, 'createdAt'>): Promise<User>;
    getUser(address: string): Promise<User | undefined>;
    updateUser(address: string, updates: Partial<Omit<User, 'address' | 'createdAt'>>): Promise<User | undefined>;
    getSessionStats(sessionId: string): Promise<AttendanceStats>;
    getCourseStats(courseId: string): Promise<CourseStats>;
    getAllAttendanceRecords(): Promise<AttendanceRecord[]>;
    getAllSessions(): Promise<Session[]>;
    validateSessionIntegrity(): Promise<{
        isValid: boolean;
        issues: string[];
    }>;
    createCertificate(data: any): Promise<mongoose.Document<unknown, {}, {
        name: string;
        studentAddress: string;
        issuedAt: Date;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    }> & {
        name: string;
        studentAddress: string;
        issuedAt: Date;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>>;
    getCertificatesByStudent(studentAddress: string): Promise<(mongoose.Document<unknown, {}, {
        name: string;
        studentAddress: string;
        issuedAt: Date;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    }> & {
        name: string;
        studentAddress: string;
        issuedAt: Date;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>)[]>;
    createStudentWork(data: any): Promise<mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>>;
    getStudentWorks(studentAddress?: string): Promise<(mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>)[]>;
    endorseStudentWork(id: string): Promise<(mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        title: string;
        fileUrl: string;
        isEndorsed: boolean;
        _id?: string;
        description?: string;
        tokenId?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>) | null>;
    createAccessPass(data: any): Promise<mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>>;
    getAccessPasses(studentAddress: string): Promise<(mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>)[]>;
    redeemAccessPass(id: string): Promise<(mongoose.Document<unknown, {}, {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    }> & {
        createdAt: Date;
        studentAddress: string;
        tokenId: number;
        passType: number;
        amount: number;
        isRedeemed: boolean;
        _id?: string;
        txHash?: string;
    } & Required<{
        _id: string;
    }>) | null>;
    getStudentPet(studentAddress: string): Promise<(mongoose.Document<unknown, {}, {
        studentAddress: string;
        stage: number;
        experience: number;
        lastUpdated: Date;
        _id?: string;
        tokenId?: string;
    }> & {
        studentAddress: string;
        stage: number;
        experience: number;
        lastUpdated: Date;
        _id?: string;
        tokenId?: string;
    } & Required<{
        _id: string;
    }>) | null>;
    createOrUpdateStudentPet(studentAddress: string, data: any): Promise<(mongoose.Document<unknown, {}, {
        studentAddress: string;
        stage: number;
        experience: number;
        lastUpdated: Date;
        _id?: string;
        tokenId?: string;
    }> & {
        studentAddress: string;
        stage: number;
        experience: number;
        lastUpdated: Date;
        _id?: string;
        tokenId?: string;
    } & Required<{
        _id: string;
    }>) | null>;
}
export declare const db: Database;
export {};
//# sourceMappingURL=database.d.ts.map