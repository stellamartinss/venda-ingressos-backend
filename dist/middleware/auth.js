"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jwt_1 = require("../lib/jwt");
const requireAuth = (roles) => {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const token = header.slice('Bearer '.length);
        try {
            const payload = (0, jwt_1.verifyJwt)(token);
            if (roles && roles.length > 0 && !roles.includes(payload.role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            req.user = payload;
            return next();
        }
        catch (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    };
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map