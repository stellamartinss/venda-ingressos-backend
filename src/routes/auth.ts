import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { signJwt } from '../lib/jwt';

const router = Router();

const signupSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
	role: z.enum(['ORGANIZER', 'CUSTOMER'])
});

router.post('/signup', async (req, res) => {
	const parsed = signupSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
	const { name, email, password, role } = parsed.data;
	const exists = await prisma.user.findUnique({ where: { email } });
	if (exists) return res.status(409).json({ message: 'Email already registered' });
	const passwordHash = await hashPassword(password);
	const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
	const token = signJwt({ userId: user.id, role: user.role as any });
	return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post('/login', async (req, res) => {
	const parsed = loginSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
	const { email, password } = parsed.data;
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(401).json({ message: 'Invalid credentials' });
	const ok = await verifyPassword(password, user.passwordHash);
	if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
	const token = signJwt({ userId: user.id, role: user.role as any });
	return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
