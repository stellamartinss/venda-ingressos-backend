import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const eventSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  location: z.string().min(3),
  city: z.string().min(2),
  category: z.string().min(2),
  dateTime: z.string(),
  bannerUrl: z.string().url().optional(),
});

router.post('/', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const data = parsed.data;
  const created = await prisma.event.create({ data: { ...data, dateTime: new Date(data.dateTime), organizerId: req.user!.userId, bannerUrl: data.bannerUrl ?? null } });
  return res.status(201).json(created);
});

router.get('/', async (req, res) => {
  const { city, category, from, to } = req.query as Record<string, string | undefined>;
  const where: any = {};
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (from || to) where.dateTime = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  const events = await prisma.event.findMany({ where, orderBy: { dateTime: 'asc' } });
  return res.json({
    count: events.length,
    data: events,
    success: true
  });
});

// GET /events/my - Returns all events created by the authenticated organizer
router.get('/my', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { organizerId: req.user!.userId },
      include: {
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantityTotal: true,
            quantitySold: true,
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    return res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching events',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

router.get('/:id', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id as string }, include: { ticketTypes: true } });
  if (!event) return res.status(404).json({ message: 'Not found' });
  return res.json(event);
});

router.put('/:id', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
  if (!event) return res.status(404).json({ message: 'Not found' });
  if (event.organizerId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  const updated = await prisma.event.update({ where: { id: req.params.id as string }, data: { ...parsed.data, bannerUrl: parsed.data.bannerUrl ?? undefined, dateTime: parsed.data.dateTime ? new Date(parsed.data.dateTime) : undefined } });
  return res.json(updated);
});

router.delete('/:id', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
  if (!event) return res.status(404).json({ message: 'Not found' });
  if (event.organizerId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  await prisma.event.delete({ where: { id: req.params.id as string } });
  return res.status(204).send();
});

const ticketTypeSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  quantityTotal: z.number().int().positive(),
});

router.post('/:eventId/tickets', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const parsed = ticketTypeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const event = await prisma.event.findUnique({ where: { id: req.params.eventId as string } });
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (event.organizerId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  const created = await prisma.ticketType.create({ data: { ...parsed.data, eventId: event.id, price: parsed.data.price } });
  return res.status(201).json(created);
});

router.get('/:eventId/tickets', async (req, res) => {
  const tickets = await prisma.ticketType.findMany({ where: { eventId: req.params.eventId as string } });
  return res.json(tickets);
});

router.put('/:eventId/tickets/:ticketId', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const parsed = ticketTypeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const tt = await prisma.ticketType.findUnique({ where: { id: req.params.ticketId as string } });
  if (!tt) return res.status(404).json({ message: 'Not found' });
  const event = await prisma.event.findUnique({ where: { id: tt.eventId } });
  if (!event || event.organizerId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  const updated = await prisma.ticketType.update({ where: { id: tt.id }, data: parsed.data });
  return res.json(updated);
});

router.delete('/:eventId/tickets/:ticketId', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const tt = await prisma.ticketType.findUnique({ where: { id: req.params.ticketId as string } });
  if (!tt) return res.status(404).json({ message: 'Not found' });
  const event = await prisma.event.findUnique({ where: { id: tt.eventId } });
  if (!event || event.organizerId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  await prisma.ticketType.delete({ where: { id: tt.id } });
  return res.status(204).send();
});

export default router;


