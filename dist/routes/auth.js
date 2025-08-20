"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const password_1 = require("../lib/password");
const jwt_1 = require("../lib/jwt");
const router = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['ORGANIZER', 'CUSTOMER'])
});
router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const { name, email, password, role } = parsed.data;
    const exists = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (exists)
        return res.status(409).json({ message: 'Email already registered' });
    const passwordHash = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({ data: { name, email, passwordHash, role } });
    const token = (0, jwt_1.signJwt)({ userId: user.id, role: user.role });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6) });
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await (0, password_1.verifyPassword)(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ message: 'Invalid credentials' });
    const token = (0, jwt_1.signJwt)({ userId: user.id, role: user.role });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.default = router;
//# sourceMappingURL=auth.js.map