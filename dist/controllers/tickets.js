"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientTickets = void 0;
const prisma_1 = require("../lib/prisma");
const getClientTickets = async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: { customerId: req.user.userId },
            include: {
                event: {
                    include: {
                        ticketTypes: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const tickets = orders.map(order => ({
            orderId: order.id,
            totalAmount: order.totalAmount,
            tickets: order.event.ticketTypes.map(tt => ({
                ticketTypeId: tt.id,
                name: tt.name,
                price: tt.price,
                quantity: tt.price
            })),
            event: {
                id: order.event.id,
                name: order.event.name,
                dateTime: order.event.dateTime,
                location: order.event.location,
                city: order.event.city,
                bannerUrl: order.event.bannerUrl,
            },
            purchasedAt: order.createdAt
        }));
        return res.json({
            success: true,
            data: tickets,
            count: tickets.length
        });
    }
    catch (error) {
        console.error('Error fetching client tickets:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching tickets',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};
exports.getClientTickets = getClientTickets;
//# sourceMappingURL=tickets.js.map