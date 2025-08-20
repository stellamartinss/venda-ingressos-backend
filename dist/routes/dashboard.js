"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/organizer', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    const organizerId = req.user.userId;
    const events = await prisma_1.prisma.event.findMany({ where: { organizerId }, select: { id: true } });
    const eventIds = events.map(e => e.id);
    const [sold, totals] = await Promise.all([
        prisma_1.prisma.ticketType.aggregate({ _sum: { quantitySold: true }, where: { eventId: { in: eventIds } } }),
        prisma_1.prisma.order.aggregate({
            _sum: { totalAmount: true, feesAmount: true, netAmount: true },
            where: { eventId: { in: eventIds }, status: 'PAID' }
        })
    ]);
    return res.json({
        ticketsSold: sold._sum.quantitySold || 0,
        grossRevenue: totals._sum.totalAmount || 0,
        fees: totals._sum.feesAmount || 0,
        netRevenue: totals._sum.netAmount || 0,
    });
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map