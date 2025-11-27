import { Request, Response, NextFunction } from 'express';
import { AuthUser } from './auth';
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authenticateToken(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireTeacher(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireStudent(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=middleware.d.ts.map