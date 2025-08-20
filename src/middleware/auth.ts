import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../lib/jwt';

export type AuthenticatedRequest = Request & { user?: JwtPayload };

export const requireAuth = (roles?: Array<JwtPayload['role']>) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		const header = req.headers.authorization;
		if (!header || !header.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = header.slice('Bearer '.length);
		try {
			const payload = verifyJwt(token);
			if (roles && roles.length > 0 && !roles.includes(payload.role)) {
				return res.status(403).json({ message: 'Forbidden' });
			}
			req.user = payload;
			return next();
		} catch (err) {
			return res.status(401).json({ message: 'Invalid token' });
		}
	};
};
