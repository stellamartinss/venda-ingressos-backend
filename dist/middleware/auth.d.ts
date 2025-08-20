import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../lib/jwt';
export type AuthenticatedRequest = Request & {
    user?: JwtPayload;
};
export declare const requireAuth: (roles?: Array<JwtPayload["role"]>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map