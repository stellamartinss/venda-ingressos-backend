import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/metrics', requireAuth(['ADMIN']), async (_req, res) => {
  const totals = await prisma.order.aggregate({ _sum: { totalAmount: true, feesAmount: true, netAmount: true }, where: { status: 'PAID' } });
  return res.json({
    grossSales: totals._sum.totalAmount || 0,
    feesCollected: totals._sum.feesAmount || 0,
    netToOrganizers: totals._sum.netAmount || 0,
  });
});

export default router;


