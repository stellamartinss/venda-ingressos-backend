"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const payment_1 = require("../services/payment");
const qr_1 = require("../services/qr");
const env_1 = require("../config/env");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const purchaseSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    items: zod_1.z.array(zod_1.z.object({
        ticketTypeId: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
    })).min(1),
});
router.post('/purchase', (0, auth_1.requireAuth)(['CUSTOMER']), async (req, res) => {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const { eventId, items } = parsed.data;
    const event = await prisma_1.prisma.event.findUnique({ where: { id: eventId } });
    if (!event)
        return res.status(404).json({ message: 'Event not found' });
    // Validate ticket availability and compute totals
    const ticketTypes = await prisma_1.prisma.ticketType.findMany({ where: { id: { in: items.map(i => i.ticketTypeId) }, eventId } });
    const byId = new Map(ticketTypes.map(t => [t.id, t]));
    if (ticketTypes.length !== items.length)
        return res.status(400).json({ message: 'Invalid ticket types' });
    const feePerTicket = env_1.config.platformFee;
    let total = 0;
    let fees = 0;
    for (const item of items) {
        const tt = byId.get(item.ticketTypeId);
        if (tt.quantitySold + item.quantity > tt.quantityTotal) {
            return res.status(400).json({ message: `Insufficient stock for ${tt.name}` });
        }
        total += Number(tt.price) * item.quantity;
        fees += feePerTicket * item.quantity;
    }
    const net = total - fees;
    // Mock payment
    const payment = await (0, payment_1.processPayment)({ amountCents: Math.round(total * 100), currency: 'BRL', description: `Order for event ${event.name}` });
    if (payment.status !== 'succeeded')
        return res.status(402).json({ message: 'Payment failed' });
    // Persist order and generate tickets atomically
    const order = await prisma_1.prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
            data: {
                customerId: req.user.userId,
                eventId,
                status: 'PAID',
                totalAmount: total,
                feesAmount: fees,
                netAmount: net,
                paymentProvider: payment.provider,
                paymentRef: payment.id,
            }
        });
        for (const item of items) {
            const tt = byId.get(item.ticketTypeId);
            const orderItem = await tx.orderItem.create({
                data: {
                    orderId: createdOrder.id,
                    ticketTypeId: tt.id,
                    unitPrice: tt.price,
                    quantity: item.quantity,
                    feePerTicket,
                    netAmount: Number(tt.price) * item.quantity - feePerTicket * item.quantity,
                }
            });
            // Update stock
            await tx.ticketType.update({ where: { id: tt.id }, data: { quantitySold: { increment: item.quantity } } });
            // Generate tickets and QR codes
            const ticketsData = [];
            for (let i = 0; i < item.quantity; i++) {
                const uniqueCode = (0, uuid_1.v4)();
                const qrPayload = JSON.stringify({ code: uniqueCode, orderItemId: orderItem.id });
                const dataUrl = await (0, qr_1.generateQrDataUrl)(qrPayload);
                ticketsData.push({ orderItemId: orderItem.id, code: uniqueCode, qrCodeData: dataUrl });
            }
            await tx.ticket.createMany({ data: ticketsData });
        }
        return createdOrder;
    });
    return res.status(201).json({ orderId: order.id });
});
// List current customer's orders with items and tickets
router.get('/my', (0, auth_1.requireAuth)(['CUSTOMER']), async (req, res) => {
    const orders = await prisma_1.prisma.order.findMany({
        where: { customerId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        include: {
            items: { include: { ticketType: true, tickets: true } },
            event: true,
        }
    });
    return res.json(orders);
});
// Get specific order; access allowed for owner customer, event organizer, or admin
router.get('/:id', (0, auth_1.requireAuth)(['CUSTOMER', 'ORGANIZER', 'ADMIN']), async (req, res) => {
    const ord = await prisma_1.prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
            items: { include: { ticketType: true, tickets: true } },
            event: { select: { id: true, organizerId: true, name: true } },
        }
    });
    if (!ord)
        return res.status(404).json({ message: 'Not found' });
    const role = req.user.role;
    const uid = req.user.userId;
    if (role !== 'ADMIN' &&
        !((role === 'CUSTOMER' && ord.customerId === uid) ||
            (role === 'ORGANIZER' && ord.event.organizerId === uid))) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    return res.json(ord);
});
exports.default = router;
//# sourceMappingURL=orders.js.map