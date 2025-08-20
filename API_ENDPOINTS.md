# API Endpoints Documentation

## New Endpoints Implementation

### 1. GET /events/my - Organizer's Events

**Endpoint:** `GET /events/my`

**Authentication:** Required (JWT Bearer Token)
**Role:** ORGANIZER only

**Description:** Returns all events created by the authenticated organizer with ticket type information and order counts.

#### Request Format
```http
GET /events/my
Authorization: Bearer <JWT_TOKEN>
```

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "event_id",
      "name": "Rock Concert 2024",
      "description": "Amazing rock concert",
      "location": "Arena Stadium",
      "city": "São Paulo",
      "category": "Music",
      "dateTime": "2024-12-25T20:00:00.000Z",
      "bannerUrl": "https://example.com/banner.jpg",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "ticketTypes": [
        {
          "id": "ticket_type_id",
          "name": "VIP",
          "price": "150.00",
          "quantityTotal": 100,
          "quantitySold": 45
        }
      ],
      "_count": {
        "orders": 12
      }
    }
  ],
  "count": 1
}
```

#### Error Responses
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User is not an ORGANIZER
- **500 Internal Server Error**: Database error

#### Database Schema Requirements
- Uses existing `Event` model with `organizerId` relationship
- Includes `TicketType` relationship for ticket information
- Uses Prisma's `_count` for order aggregation

#### Testing Scenarios
1. **Valid Organizer Request**
   ```bash
   curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" \
        http://localhost:4000/events/my
   ```

2. **Unauthenticated Request**
   ```bash
   curl http://localhost:4000/events/my
   # Expected: 401 Unauthorized
   ```

3. **Customer Role Request**
   ```bash
   curl -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
        http://localhost:4000/events/my
   # Expected: 403 Forbidden
   ```

---

### 2. GET /organizer/report - Sales Statistics Report

**Endpoint:** `GET /organizer/report`

**Authentication:** Required (JWT Bearer Token)
**Role:** ORGANIZER only

**Description:** Returns comprehensive sales statistics for the authenticated organizer with filtering options.

#### Request Format
```http
GET /organizer/report?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&eventId=event_id&groupBy=event
Authorization: Bearer <JWT_TOKEN>
```

#### Query Parameters
- `startDate` (optional): ISO 8601 datetime - Filter orders from this date
- `endDate` (optional): ISO 8601 datetime - Filter orders until this date
- `eventId` (optional): string - Filter by specific event
- `groupBy` (optional): "day" | "week" | "month" | "event" - Grouping method (default: "event")

#### Response Format
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 150,
      "totalRevenue": 15000.00,
      "totalFees": 300.00,
      "netRevenue": 14700.00,
      "totalTicketsSold": 300,
      "averageOrderValue": 100.00,
      "conversionRate": 0
    },
    "events": [
      {
        "eventId": "event_id",
        "eventName": "Rock Concert 2024",
        "eventDate": "2024-12-25T20:00:00.000Z",
        "city": "São Paulo",
        "category": "Music",
        "orders": 75,
        "revenue": 7500.00,
        "fees": 150.00,
        "netRevenue": 7350.00
      }
    ],
    "ticketTypes": [
      {
        "ticketTypeId": "ticket_type_id",
        "ticketName": "VIP",
        "eventName": "Rock Concert 2024",
        "price": 150.00,
        "quantitySold": 50,
        "revenue": 7350.00,
        "orders": 50
      }
    ],
    "recentOrders": [
      {
        "orderId": "order_id",
        "eventName": "Rock Concert 2024",
        "eventDate": "2024-12-25T20:00:00.000Z",
        "totalAmount": 150.00,
        "netAmount": 148.00,
        "items": [
          {
            "ticketType": "VIP",
            "quantity": 1,
            "unitPrice": 150.00
          }
        ],
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "filters": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "eventId": "event_id",
      "groupBy": "event"
    }
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid query parameters
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User is not an ORGANIZER
- **500 Internal Server Error**: Database error

#### Database Schema Requirements
- Uses `Order` model with `event.organizerId` relationship
- Aggregates data using Prisma's `aggregate`, `groupBy`, and `_sum` functions
- Includes relationships: `Order` → `Event` → `User` (organizer)
- Includes relationships: `Order` → `OrderItem` → `TicketType`

#### Sales Calculations
- **Total Revenue**: Sum of all order `totalAmount`
- **Total Fees**: Sum of all order `feesAmount` (R$ 2.00 per ticket)
- **Net Revenue**: Sum of all order `netAmount` (total - fees)
- **Average Order Value**: Total Revenue / Total Orders
- **Total Tickets Sold**: Sum of all `OrderItem.quantity`

#### Testing Scenarios

1. **Basic Report Request**
   ```bash
   curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" \
        http://localhost:4000/organizer/report
   ```

2. **Filtered Report Request**
   ```bash
   curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" \
        "http://localhost:4000/organizer/report?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z"
   ```

3. **Event-Specific Report**
   ```bash
   curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" \
        "http://localhost:4000/organizer/report?eventId=event_id"
   ```

4. **Invalid Date Format**
   ```bash
   curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" \
        "http://localhost:4000/organizer/report?startDate=invalid-date"
   # Expected: 400 Bad Request
   ```

5. **Unauthenticated Request**
   ```bash
   curl http://localhost:4000/organizer/report
   # Expected: 401 Unauthorized
   ```

6. **Customer Role Request**
   ```bash
   curl -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
        http://localhost:4000/organizer/report
   # Expected: 403 Forbidden
   ```

---

## Implementation Details

### Authentication & Authorization
- **JWT Token Required**: All endpoints require valid JWT token in Authorization header
- **Role-Based Access**: Only users with `ORGANIZER` role can access these endpoints
- **Token Validation**: Uses `requireAuth(['ORGANIZER'])` middleware

### Error Handling
- **Input Validation**: Uses Zod schemas for query parameter validation
- **Database Errors**: Wrapped in try-catch blocks with proper error responses
- **Development Mode**: Includes error details in development environment
- **Production Mode**: Sanitized error messages for security

### Database Relationships
```sql
-- Key relationships used
User (organizer) → Event (organizerId)
Event → Order (eventId)
Order → OrderItem (orderId)
OrderItem → TicketType (ticketTypeId)
OrderItem → Ticket (orderItemId)
```

### Performance Considerations
- **Efficient Queries**: Uses Prisma's aggregation functions for calculations
- **Parallel Execution**: Uses `Promise.all()` for concurrent database queries
- **Selective Includes**: Only fetches necessary fields to minimize data transfer
- **Pagination**: Recent orders limited to 10 items

### Security Features
- **Role Validation**: Ensures only organizers can access their data
- **Data Isolation**: Organizers can only see their own events and orders
- **Input Sanitization**: Query parameters validated and sanitized
- **Error Information**: Limited error details in production

### Additional Endpoint: GET /organizer/events

**Bonus endpoint** that provides events with basic statistics:

```http
GET /organizer/events
Authorization: Bearer <ORGANIZER_TOKEN>
```

**Response includes:**
- Event details with ticket types
- Revenue statistics per event
- Sold-out percentages
- Average order values

This endpoint is useful for dashboard overviews and event management interfaces.
