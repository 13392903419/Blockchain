export interface AuthUser {
    address: string;
    role: 'teacher' | 'student';
    nonce: string;
}
export declare function generateChallenge(): string;
export declare function verifySignature(address: string, signature: string, message: string): boolean;
export declare function generateToken(user: AuthUser): string;
export declare function verifyToken(token: string): AuthUser | null;
export declare function isTeacher(address: string, ownerAddress: string): boolean;
//# sourceMappingURL=auth.d.ts.map