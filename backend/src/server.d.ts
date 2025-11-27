declare const express: any;
declare const cors: any;
declare const dotenv: any;
declare const helmet: any;
declare const rateLimit: any;
declare const ethers: any;
declare const generateChallenge: any, verifySignature: any, generateToken: any, isTeacher: any;
declare const authenticateToken: any, requireTeacher: any, requireStudent: any;
declare const db: any, connectDB: any;
declare let globalProvider: any;
declare function getProvider(): any;
declare function startBlockchainListener(retryCount?: number): Promise<void>;
declare const app: any;
declare const limiter: any;
declare const rpcUrl: string;
declare const ownerPk: string;
declare const contractAddress: string;
declare const attendanceAbi: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "sessionId";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "student";
        readonly type: "address";
    }, {
        readonly internalType: "string";
        readonly name: "tokenUri";
        readonly type: "string";
    }];
    readonly name: "mintAttendance";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
declare const port: number;
//# sourceMappingURL=server.d.ts.map