"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const tickets_1 = require("../controllers/tickets");
const router = (0, express_1.Router)();
const eventSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    location: zod_1.z.string().min(3),
    city: zod_1.z.string().min(2),
    category: zod_1.z.string().min(2),
    dateTime: zod_1.z.string(),
    bannerUrl: zod_1.z.string().url().optional(),
    isDeleted: zod_1.z.boolean().optional().default(false),
});
const ticketTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    price: zod_1.z.number().positive(),
    quantityTotal: zod_1.z.number().int().positive(),
});
router.post('/', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    const parsedTicketTypes = zod_1.z.array(ticketTypeSchema).safeParse(req.body.ticketTypes || []);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const data = parsed.data;
    const created = await prisma_1.prisma.event.create({ data: { ...data, dateTime: new Date(data.dateTime), organizerId: req.user.userId, bannerUrl: data.bannerUrl ?? null } });
    if (!parsedTicketTypes.success) {
        return res.status(400).json({ errors: parsedTicketTypes.error.flatten() });
    }
    const ticketTypesData = parsedTicketTypes.data.map(tt => ({
        ...tt,
        eventId: created.id,
    }));
    await prisma_1.prisma.ticketType.createMany({
        data: ticketTypesData,
    });
    console.log('not parsed data:', req.body);
    console.log('parsed data:', parsed.data);
    return res.status(201).json(created);
});
router.get('/', async (req, res) => {
    const { city, category, from, to } = req.query;
    const where = { isDeleted: false };
    if (city)
        where.city = { contains: city, mode: 'insensitive' };
    if (category)
        where.category = { contains: category, mode: 'insensitive' };
    if (from || to)
        where.dateTime = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    const events = await prisma_1.prisma.event.findMany({ where, orderBy: { dateTime: 'asc' } });
    return res.json({
        count: events.length,
        data: events,
        success: true
    });
});
// GET /events/my - Returns all events created by the authenticated organizer
router.get('/my', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    try {
        const events = await prisma_1.prisma.event.findMany({
            where: { organizerId: req.user.userId, isDeleted: false },
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
    }
    catch (error) {
        console.error('Error fetching organizer events:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching events',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
router.get('/:id', async (req, res) => {
    const event = await prisma_1.prisma.event.findUnique({ where: { id: req.params.id }, include: { ticketTypes: true } });
    if (!event)
        return res.status(404).json({ message: 'Not found' });
    return res.json(event);
});
router.put('/:id', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const parsed = eventSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const event = await prisma_1.prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event)
        return res.status(404).json({ message: 'Not found' });
    if (event.organizerId !== req.user.userId)
        return res.status(403).json({ message: 'Forbidden' });
    const updated = await prisma_1.prisma.event.update({ where: { id: req.params.id }, data: { ...parsed.data, bannerUrl: parsed.data.bannerUrl ?? undefined, dateTime: parsed.data.dateTime ? new Date(parsed.data.dateTime) : undefined } });
    return res.json(updated);
});
router.delete('/:id', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    console.log('Deleting event with ID:', req.params.id);
    if (!req.params.id)
        return res.status(400).json({ errors: ['Event ID is required'] });
    const event = await prisma_1.prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event)
        return res.status(404).json({ message: 'Not found' });
    if (event.organizerId !== req.user.userId)
        return res.status(403).json({ message: 'Forbidden' });
    const updated = await prisma_1.prisma.event.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    return res.json(updated);
    // return res.status(204).send();
});
router.post('/:eventId/tickets', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const parsed = ticketTypeSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const event = await prisma_1.prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event)
        return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId !== req.user.userId)
        return res.status(403).json({ message: 'Forbidden' });
    const created = await prisma_1.prisma.ticketType.create({ data: { ...parsed.data, eventId: event.id, price: parsed.data.price } });
    return res.status(201).json(created);
});
router.get('/:eventId/tickets', async (req, res) => {
    const tickets = await prisma_1.prisma.ticketType.findMany({ where: { eventId: req.params.eventId } });
    return res.json(tickets);
});
router.put('/:eventId/tickets/:ticketId', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const parsed = ticketTypeSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const tt = await prisma_1.prisma.ticketType.findUnique({ where: { id: req.params.ticketId } });
    if (!tt)
        return res.status(404).json({ message: 'Not found' });
    const event = await prisma_1.prisma.event.findUnique({ where: { id: tt.eventId } });
    if (!event || event.organizerId !== req.user.userId)
        return res.status(403).json({ message: 'Forbidden' });
    const updated = await prisma_1.prisma.ticketType.update({ where: { id: tt.id }, data: parsed.data });
    return res.json(updated);
});
router.delete('/:eventId/tickets/:ticketId', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const tt = await prisma_1.prisma.ticketType.findUnique({ where: { id: req.params.ticketId } });
    if (!tt)
        return res.status(404).json({ message: 'Not found' });
    const event = await prisma_1.prisma.event.findUnique({ where: { id: tt.eventId } });
    if (!event || event.organizerId !== req.user.userId)
        return res.status(403).json({ message: 'Forbidden' });
    await prisma_1.prisma.ticketType.delete({ where: { id: tt.id } });
    return res.status(204).send();
});
router.get('/my-tickets', (0, auth_1.requireAuth)(['CUSTOMER']), tickets_1.getClientTickets);
exports.default = router;
//# sourceMappingURL=events.js.map