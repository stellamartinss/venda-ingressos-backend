"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Query parameters schema for filtering reports
const reportQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    eventId: zod_1.z.string().optional(),
    groupBy: zod_1.z.enum(['day', 'week', 'month', 'event']).optional().default('event'),
});
// GET /organizer/report - Returns comprehensive sales statistics for the organizer
router.get('/report', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    try {
        const queryParams = reportQuerySchema.safeParse(req.query);
        if (!queryParams.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors: queryParams.error.flatten()
            });
        }
        const { startDate, endDate, eventId, groupBy } = queryParams.data;
        const organizerId = req.user.userId;
        // Build where clause for filtering
        const whereClause = {
            event: {
                organizerId: organizerId
            },
            status: 'PAID'
        };
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate)
                whereClause.createdAt.gte = new Date(startDate);
            if (endDate)
                whereClause.createdAt.lte = new Date(endDate);
        }
        if (eventId) {
            whereClause.eventId = eventId;
        }
        // Get basic aggregated statistics
        const [basicStats, eventStats, ticketTypeStats, recentOrders] = await Promise.all([
            // Basic aggregated statistics
            prisma_1.prisma.order.aggregate({
                where: whereClause,
                _sum: {
                    totalAmount: true,
                    feesAmount: true,
                    netAmount: true,
                },
                _count: {
                    id: true,
                },
            }),
            // Statistics grouped by event
            prisma_1.prisma.order.groupBy({
                by: ['eventId'],
                where: whereClause,
                _sum: {
                    totalAmount: true,
                    feesAmount: true,
                    netAmount: true,
                },
                _count: {
                    id: true,
                },
                orderBy: {
                    _sum: {
                        totalAmount: 'desc'
                    }
                }
            }),
            // Ticket type performance
            prisma_1.prisma.orderItem.groupBy({
                by: ['ticketTypeId'],
                where: {
                    order: whereClause
                },
                _sum: {
                    quantity: true,
                    netAmount: true,
                },
                _count: {
                    id: true,
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                }
            }),
            // Recent orders (last 10)
            prisma_1.prisma.order.findMany({
                where: whereClause,
                include: {
                    event: {
                        select: {
                            name: true,
                            dateTime: true,
                        }
                    },
                    items: {
                        include: {
                            ticketType: {
                                select: {
                                    name: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            })
        ]);
        // Get event details for event-based statistics
        const eventDetails = await prisma_1.prisma.event.findMany({
            where: {
                id: {
                    in: eventStats.map(stat => stat.eventId)
                }
            },
            select: {
                id: true,
                name: true,
                dateTime: true,
                city: true,
                category: true,
            }
        });
        // Get ticket type details for ticket-based statistics
        const ticketTypeDetails = await prisma_1.prisma.ticketType.findMany({
            where: {
                id: {
                    in: ticketTypeStats.map(stat => stat.ticketTypeId)
                }
            },
            select: {
                id: true,
                name: true,
                price: true,
                event: {
                    select: {
                        name: true,
                    }
                }
            }
        });
        // Calculate additional metrics
        const totalTicketsSold = ticketTypeStats.reduce((sum, stat) => sum + (stat._sum.quantity || 0), 0);
        const averageOrderValue = basicStats._count.id > 0
            ? Number(basicStats._sum.totalAmount || 0) / basicStats._count.id
            : 0;
        // Build response
        const response = {
            success: true,
            data: {
                summary: {
                    totalOrders: basicStats._count.id,
                    totalRevenue: Number(basicStats._sum.totalAmount || 0),
                    totalFees: Number(basicStats._sum.feesAmount || 0),
                    netRevenue: Number(basicStats._sum.netAmount || 0),
                    totalTicketsSold,
                    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                    conversionRate: 0, // Would need total visitors data
                },
                events: eventStats.map(stat => {
                    const eventDetail = eventDetails.find(e => e.id === stat.eventId);
                    return {
                        eventId: stat.eventId,
                        eventName: eventDetail?.name || 'Unknown Event',
                        eventDate: eventDetail?.dateTime,
                        city: eventDetail?.city,
                        category: eventDetail?.category,
                        orders: stat._count.id,
                        revenue: Number(stat._sum.totalAmount || 0),
                        fees: Number(stat._sum.feesAmount || 0),
                        netRevenue: Number(stat._sum.netAmount || 0),
                    };
                }),
                ticketTypes: ticketTypeStats.map(stat => {
                    const ticketDetail = ticketTypeDetails.find(t => t.id === stat.ticketTypeId);
                    return {
                        ticketTypeId: stat.ticketTypeId,
                        ticketName: ticketDetail?.name || 'Unknown Ticket',
                        eventName: ticketDetail?.event?.name || 'Unknown Event',
                        price: Number(ticketDetail?.price || 0),
                        quantitySold: stat._sum.quantity || 0,
                        revenue: Number(stat._sum.netAmount || 0),
                        orders: stat._count.id,
                    };
                }),
                recentOrders: recentOrders.map(order => ({
                    orderId: order.id,
                    eventName: order.event.name,
                    eventDate: order.event.dateTime,
                    totalAmount: Number(order.totalAmount),
                    netAmount: Number(order.netAmount),
                    items: order.items.map(item => ({
                        ticketType: item.ticketType.name,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                    })),
                    createdAt: order.createdAt,
                })),
                filters: {
                    startDate,
                    endDate,
                    eventId,
                    groupBy,
                }
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error generating organizer report:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while generating report',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
// GET /organizer/events - Returns all events with basic stats for the organizer
router.get('/events', (0, auth_1.requireAuth)(['ORGANIZER']), async (req, res) => {
    try {
        const events = await prisma_1.prisma.event.findMany({
            where: { organizerId: req.user.userId },
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
                orders: {
                    where: { status: 'PAID' },
                    select: {
                        id: true,
                        totalAmount: true,
                        netAmount: true,
                        createdAt: true,
                    }
                },
                _count: {
                    select: {
                        orders: {
                            where: { status: 'PAID' }
                        }
                    }
                }
            },
            orderBy: { dateTime: 'desc' }
        });
        const eventsWithStats = events.map(event => {
            const totalRevenue = event.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
            const netRevenue = event.orders.reduce((sum, order) => sum + Number(order.netAmount), 0);
            const totalTicketsSold = event.ticketTypes.reduce((sum, tt) => sum + tt.quantitySold, 0);
            const totalTicketsAvailable = event.ticketTypes.reduce((sum, tt) => sum + tt.quantityTotal, 0);
            return {
                ...event,
                stats: {
                    totalRevenue,
                    netRevenue,
                    totalTicketsSold,
                    totalTicketsAvailable,
                    soldOutPercentage: totalTicketsAvailable > 0 ? (totalTicketsSold / totalTicketsAvailable) * 100 : 0,
                    averageOrderValue: event.orders.length > 0 ? totalRevenue / event.orders.length : 0,
                },
                orders: undefined, // Remove orders from response to keep it clean
            };
        });
        return res.json({
            success: true,
            data: eventsWithStats,
            count: eventsWithStats.length
        });
    }
    catch (error) {
        console.error('Error fetching organizer events with stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching events',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=organizer.js.map