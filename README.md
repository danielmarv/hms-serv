# Hotel Management System API

A comprehensive API for hotel management, including room management, guest management, bookings, invoicing, inventory, and restaurant operations.

## Features

- **Authentication & User Management**
  - User registration, login, and profile management
  - Role-based access control
  - Password reset and email verification

- **Room Management**
  - Room types and categories
  - Room status tracking
  - Maintenance request management
  - Housekeeping schedule management

- **Guest Management**
  - Guest profiles and preferences
  - Loyalty program management
  - VIP and blacklist management

- **Booking Management**
  - Reservation creation and management
  - Check-in and check-out processes
  - Room availability checking
  - Booking calendar

- **Finance Management**
  - Invoice generation and management
  - Payment processing
  - Receipt generation
  - Financial reporting

- **Inventory Management**
  - Inventory tracking
  - Stock level management
  - Supplier management
  - Inventory transactions

- **Restaurant Management**
  - Menu item management
  - Table management
  - Order processing
  - Kitchen order management

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, XSS Protection
- **Validation**: Express Validator
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
   \`\`\`bash
   git clone https://github.com/yourusername/hotel-management-api.git
   cd hotel-management-api
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables
   Create a `.env` file in the root directory with the following variables:
   \`\`\`
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/hotel-management
   JWT_SECRET=your_jwt_secret
   JWT_ACCESS_EXPIRY=1d
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   JWT_REFRESH_EXPIRY=7d
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USERNAME=your_email@example.com
   EMAIL_PASSWORD=your_email_password
   EMAIL_FROM_NAME=Hotel Management
   EMAIL_FROM_ADDRESS=noreply@hotel.com
   \`\`\`

4. Start the server
   \`\`\`bash
   npm run dev
   \`\`\`

### API Documentation

API documentation is available at `/api-docs` when the server is running.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email
- `GET /api/auth/me` - Get current user profile

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/status` - Update user status
- `PATCH /api/users/:id/role` - Assign role to user
- `PATCH /api/users/:id/permissions` - Assign permissions to user
- `GET /api/users/:id/permissions` - Get user permissions

### Room Types
- `GET /api/room-types` - Get all room types
- `GET /api/room-types/:id` - Get room type by ID
- `POST /api/room-types` - Create a new room type
- `PUT /api/room-types/:id` - Update room type
- `DELETE /api/room-types/:id` - Delete room type
- `GET /api/room-types/stats` - Get room type statistics

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create a new room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room
- `PATCH /api/rooms/:id/status` - Update room status
- `GET /api/rooms/stats` - Get room statistics
- `GET /api/rooms/available` - Get available rooms
- `POST /api/rooms/connect` - Connect rooms (for adjoining rooms)
- `POST /api/rooms/disconnect` - Disconnect rooms

### Maintenance
- `GET /api/maintenance` - Get all maintenance requests
- `GET /api/maintenance/:id` - Get maintenance request by ID
- `POST /api/maintenance` - Create a new maintenance request
- `PUT /api/maintenance/:id` - Update maintenance request
- `DELETE /api/maintenance/:id` - Delete maintenance request
- `PATCH /api/maintenance/:id/assign` - Assign maintenance request
- `GET /api/maintenance/stats` - Get maintenance statistics

### Housekeeping
- `GET /api/housekeeping` - Get all housekeeping schedules
- `GET /api/housekeeping/:id` - Get housekeeping schedule by ID
- `POST /api/housekeeping` - Create a new housekeeping schedule
- `PUT /api/housekeeping/:id` - Update housekeeping schedule
- `DELETE /api/housekeeping/:id` - Delete housekeeping schedule
- `PATCH /api/housekeeping/:id/assign` - Assign housekeeping schedule
- `POST /api/housekeeping/bulk` - Bulk create housekeeping schedules
- `GET /api/housekeeping/stats` - Get housekeeping statistics

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get guest by ID
- `POST /api/guests` - Create a new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest
- `GET /api/guests/:id/bookings` - Get guest booking history
- `PATCH /api/guests/:id/loyalty` - Update guest loyalty status
- `PATCH /api/guests/:id/vip` - Toggle guest VIP status
- `PATCH /api/guests/:id/blacklist` - Toggle guest blacklist status
- `GET /api/guests/stats` - Get guest statistics

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create a new booking
- `PUT /api/bookings/:id` - Update booking
- `PATCH /api/bookings/:id/cancel` - Cancel booking
- `PATCH /api/bookings/:id/check-in` - Check-in
- `PATCH /api/bookings/:id/check-out` - Check-out
- `GET /api/bookings/available-rooms` - Get available rooms for booking
- `GET /api/bookings/stats` - Get booking statistics
- `GET /api/bookings/calendar` - Get booking calendar data

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create a new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `PATCH /api/invoices/:id/issue` - Issue invoice
- `PATCH /api/invoices/:id/cancel` - Cancel invoice
- `PATCH /api/invoices/:id/payment` - Record payment
- `POST /api/invoices/:id/email` - Send invoice by email
- `GET /api/invoices/stats` - Get invoice statistics

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create a new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `PATCH /api/payments/:id/refund` - Process refund
- `PATCH /api/payments/:id/receipt` - Issue receipt
- `POST /api/payments/:id/email` - Send receipt by email
- `GET /api/payments/stats` - Get payment statistics

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get inventory item by ID
- `POST /api/inventory` - Create a new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `PATCH /api/inventory/:id/stock` - Update stock level
- `GET /api/inventory/:id/transactions` - Get item transactions
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/stats` - Get inventory statistics

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create a new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/suppliers/:id/items` - Get supplier items
- `PATCH /api/suppliers/:id/toggle-status` - Toggle supplier active status
- `POST /api/suppliers/:id/documents` - Add document to supplier
- `DELETE /api/suppliers/:id/documents/:documentId` - Remove document from supplier

### Restaurant - Menu Items
- `GET /api/restaurant/menu-items` - Get all menu items
- `GET /api/restaurant/menu-items/:id` - Get menu item by ID
- `POST /api/restaurant/menu-items` - Create a new menu item
- `PUT /api/restaurant/menu-items/:id` - Update menu item
- `DELETE /api/restaurant/menu-items/:id` - Delete menu item
- `PATCH /api/restaurant/menu-items/:id/availability` - Toggle menu item availability
- `PATCH /api/restaurant/menu-items/:id/featured` - Toggle menu item featured status

### Restaurant - Tables
- `GET /api/restaurant/tables` - Get all tables
- `GET /api/restaurant/tables/:id` - Get table by ID
- `POST /api/restaurant/tables` - Create a new table
- `PUT /api/restaurant/tables/:id` - Update table
- `DELETE /api/restaurant/tables/:id` - Delete table
- `PATCH /api/restaurant/tables/:id/status` - Update table status

### Restaurant - Orders
- `GET /api/restaurant/orders` - Get all orders
- `GET /api/restaurant/orders/:id` - Get order by ID
- `POST /api/restaurant/orders` - Create a new order
- `PUT /api/restaurant/orders/:id` - Update order
- `PATCH /api/restaurant/orders/:id/status` - Update order status
- `PATCH /api/restaurant/orders/:id/payment` - Update order payment status
- `GET /api/restaurant/orders/stats` - Get order statistics

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped with the development of this API.
