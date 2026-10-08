# Hotel Room Booking & Management System

A beginner-friendly full-stack college mini project that demonstrates REST APIs, CRUD operations, SQLite, Express.js middleware, input validation, and booking overlap logic.

The frontend is plain HTML, CSS and JavaScript. It talks to the backend using the Fetch API and JSON. There is no React, Angular or Vue.

## Project description

GrandStay is a hotel management web application. Reception staff can:

- View dashboard statistics
- Add, search, update and delete rooms
- Search rooms that are free for given dates
- Book a room for a guest
- View and cancel bookings without deleting history

## Features

- Dashboard cards: total rooms, available rooms, booked rooms, total bookings, cancelled bookings
- Room CRUD with unique room numbers
- Filter rooms by type and search by room number
- Date-based availability search
- Booking with guest details and total amount calculation
- Overlap / double-booking prevention
- Soft cancel (status becomes `Cancelled`, row stays in the database)
- Room delete blocked if an active confirmed booking exists
- Toast notifications and confirmation dialogs
- Single Express server for both API and frontend

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, Fetch API |
| Backend | Node.js, Express.js |
| Database | SQLite (`hotel.db`) |
| Communication | REST API + JSON |
| Extra packages | `cors`, `dotenv`, `sqlite3`, `nodemon` |

## System architecture

```
Browser (public/index.html + script.js)
        |
        |  Fetch API  (JSON)
        v
Express server (server/server.js)
        |
        |  Routes + middleware + controllers
        v
SQLite database (hotel.db)
```

1. The browser loads static files from the `public` folder.
2. JavaScript calls REST endpoints such as `GET /api/rooms`.
3. Express routes send the request to a controller.
4. Controllers run parameterized SQL queries.
5. JSON is returned and the page updates without a full reload.

## Database design

### `rooms`

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Room ID |
| room_number | TEXT UNIQUE NOT NULL | Must be unique |
| room_type | TEXT NOT NULL | Single / Double / Deluxe / Suite |
| price | REAL NOT NULL | Price per night in INR |
| status | TEXT DEFAULT 'Available' | Available or Booked |

### `bookings`

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Booking ID |
| guest_name | TEXT NOT NULL | Guest full name |
| guest_email | TEXT NOT NULL | Valid email |
| guest_phone | TEXT NOT NULL | 10-digit phone |
| room_id | INTEGER NOT NULL | Foreign key to `rooms(id)` |
| check_in | DATE NOT NULL | YYYY-MM-DD |
| check_out | DATE NOT NULL | Must be after check-in |
| status | TEXT DEFAULT 'Confirmed' | Confirmed / Cancelled / Completed |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Created time |

Relationship: one room can have many bookings.

## API endpoints

### Rooms

- `GET /api/rooms` — all rooms (optional `q` and `type` query)
- `GET /api/rooms/:id` — one room
- `POST /api/rooms` — add room
- `PUT /api/rooms/:id` — update room
- `DELETE /api/rooms/:id` — delete room if no active booking
- `GET /api/rooms/search?type=Deluxe&checkIn=2026-10-10&checkOut=2026-10-13` — available rooms

### Bookings

- `GET /api/bookings` — all bookings (optional `q`)
- `GET /api/bookings/:id` — one booking
- `POST /api/bookings` — create booking
- `PUT /api/bookings/:id` — update booking
- `POST /api/bookings/:id/cancel` — cancel booking
- `DELETE /api/bookings/:id` — same as cancel (history is kept)

### Dashboard

- `GET /api/dashboard/stats`

### Health

- `GET /api/health`

## Installation steps

Make sure Node.js is installed.

```bash
cd C:\Users\saumy\OneDrive\Desktop\Saumya_104_TA
npm install
```

## How to run

Development (auto restart with nodemon):

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

Open:

```
http://localhost:5000
```

The frontend is served by the same Express server.

## How to use

1. Open the dashboard to see counts.
2. Go to **Rooms** to add or edit rooms.
3. Go to **Search Rooms**, choose type and dates, then book a matching room.
4. Or go to **Book Room**, fill guest details, and confirm.
5. Go to **Bookings** to view, search or cancel a reservation.

## Sample API requests

Add a room:

```bash
curl -X POST http://localhost:5000/api/rooms ^
  -H "Content-Type: application/json" ^
  -d "{\"room_number\":\"201\",\"room_type\":\"Suite\",\"price\":5500,\"status\":\"Available\"}"
```

Search available Deluxe rooms:

```bash
curl "http://localhost:5000/api/rooms/search?type=Deluxe&checkIn=2026-10-10&checkOut=2026-10-13"
```

Create a booking:

```bash
curl -X POST http://localhost:5000/api/bookings ^
  -H "Content-Type: application/json" ^
  -d "{\"guest_name\":\"Asha Sharma\",\"guest_email\":\"asha@example.com\",\"guest_phone\":\"9876543210\",\"room_id\":3,\"check_in\":\"2026-10-10\",\"check_out\":\"2026-10-13\"}"
```

Cancel a booking:

```bash
curl -X POST http://localhost:5000/api/bookings/1/cancel
```

## Validation rules

Rooms:

- Room number required and unique
- Type must be Single, Double, Deluxe or Suite
- Price >= 0
- Status must be Available or Booked
- Delete is blocked if a Confirmed booking exists

Bookings:

- Guest name required
- Email must look like `name@domain.com`
- Phone must be 10 digits
- Room must exist
- Dates must be valid `YYYY-MM-DD`
- Check-out must be after check-in
- No overlapping Confirmed booking for the same room

HTTP status codes:

- `200` success
- `201` created
- `400` validation error
- `404` not found
- `409` conflict (duplicate room number or double booking)
- `500` server error

## Double-booking prevention

A new booking is allowed only if no Confirmed booking for that room overlaps:

```
existing.check_in < requested_check_out
AND existing.check_out > requested_check_in
```

Cancelled bookings are ignored, so the room can be booked again.

## Future enhancements

- Staff login and JWT authentication
- Payment module
- Invoice PDF
- Room images
- Reports by month
- Mark housekeeping / maintenance status

## Project structure

```
Saumya_104_TA/
├── server/
│   ├── server.js
│   ├── database.js
│   ├── routes/
│   │   ├── roomRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── dashboardRoutes.js
│   ├── controllers/
│   │   ├── roomController.js
│   │   ├── bookingController.js
│   │   └── dashboardController.js
│   └── middleware/
│       └── validation.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── package.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```
