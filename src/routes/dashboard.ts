import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/organizer', requireAuth(['ORGANIZER']), async (req: AuthenticatedRequest, res) => {
  const organizerId = req.user!.userId;
  const events = await prisma.event.findMany({ where: { organizerId }, select: { id: true } });
  const eventIds = events.map(e => e.id);

  const [sold, totals] = await Promise.all([
    prisma.ticketType.aggregate({ _sum: { quantitySold: true }, where: { eventId: { in: eventIds } } }),
    prisma.order.aggregate({
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

export default router;


