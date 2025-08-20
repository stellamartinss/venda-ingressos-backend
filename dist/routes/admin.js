"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/metrics', (0, auth_1.requireAuth)(['ADMIN']), async (_req, res) => {
    const totals = await prisma_1.prisma.order.aggregate({ _sum: { totalAmount: true, feesAmount: true, netAmount: true }, where: { status: 'PAID' } });
    return res.json({
        grossSales: totals._sum.totalAmount || 0,
        feesCollected: totals._sum.feesAmount || 0,
        netToOrganizers: totals._sum.netAmount || 0,
    });
});
exports.default = router;
//# sourceMappingURL=admin.js.map