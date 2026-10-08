/**
 * bookingController.js
 * Create bookings, list/search them, and cancel (soft delete).
 */
const { dbAll, dbGet, dbRun } = require("../database");
const { nightsBetween, sendError } = require("../middleware/validation");
const { syncRoomStatus } = require("./roomController");

const BOOKING_SELECT = `
  SELECT
    b.id,
    b.guest_name,
    b.guest_email,
    b.guest_phone,
    b.room_id,
    b.check_in,
    b.check_out,
    b.status,
    b.created_at,
    r.room_number,
    r.room_type,
    r.price,
    CAST(julianday(b.check_out) - julianday(b.check_in) AS INTEGER) AS number_of_nights,
    ROUND((julianday(b.check_out) - julianday(b.check_in)) * r.price, 2) AS total_amount
  FROM bookings b
  INNER JOIN rooms r ON r.id = b.room_id
`;

async function markCompletedBookings() {
  // Confirmed stays whose check-out date has already passed become Completed.
  await dbRun(
    `UPDATE bookings
     SET status = 'Completed'
     WHERE status = 'Confirmed'
       AND date(check_out) <= date('now')`
  );
}

async function findOverlap(roomId, checkIn, checkOut, excludeBookingId = null) {
  let sql = `
    SELECT id FROM bookings
    WHERE room_id = ?
      AND status = 'Confirmed'
      AND check_in < ?
      AND check_out > ?
  `;
  const params = [roomId, checkOut, checkIn];

  if (excludeBookingId) {
    sql += " AND id != ?";
    params.push(excludeBookingId);
  }

  return dbGet(sql, params);
}

async function getAllBookings(req, res) {
  try {
    await markCompletedBookings();

    const { q } = req.query;
    let sql = BOOKING_SELECT + " WHERE 1=1";
    const params = [];

    if (q) {
      sql += ` AND (
        b.guest_name LIKE ?
        OR CAST(b.id AS TEXT) LIKE ?
        OR r.room_number LIKE ?
      )`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY b.id DESC";
    const bookings = await dbAll(sql, params);

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch bookings");
  }
}

async function getBookingById(req, res) {
  try {
    await markCompletedBookings();
    const booking = await dbGet(BOOKING_SELECT + " WHERE b.id = ?", [req.params.id]);
    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully",
      data: booking
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch booking");
  }
}

async function createBooking(req, res) {
  try {
    const { guest_name, guest_email, guest_phone, room_id, check_in, check_out } = req.body;

    const room = await dbGet("SELECT * FROM rooms WHERE id = ?", [room_id]);
    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    const overlap = await findOverlap(room_id, check_in, check_out);
    if (overlap) {
      return sendError(res, 409, "Room is already booked for the selected dates");
    }

    const result = await dbRun(
      `INSERT INTO bookings
        (guest_name, guest_email, guest_phone, room_id, check_in, check_out, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Confirmed')`,
      [guest_name, guest_email, guest_phone, room_id, check_in, check_out]
    );

    await syncRoomStatus(room_id);

    const booking = await dbGet(BOOKING_SELECT + " WHERE b.id = ?", [result.lastID]);
    const nights = nightsBetween(check_in, check_out);

    return res.status(201).json({
      success: true,
      message: "Room booked successfully",
      data: {
        ...booking,
        number_of_nights: nights,
        total_amount: nights * room.price
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to create booking");
  }
}

async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { guest_name, guest_email, guest_phone, room_id, check_in, check_out } = req.body;

    const existing = await dbGet("SELECT * FROM bookings WHERE id = ?", [id]);
    if (!existing) {
      return sendError(res, 404, "Booking not found");
    }

    if (existing.status === "Cancelled") {
      return sendError(res, 400, "Cancelled bookings cannot be updated");
    }

    const room = await dbGet("SELECT * FROM rooms WHERE id = ?", [room_id]);
    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    const overlap = await findOverlap(room_id, check_in, check_out, id);
    if (overlap) {
      return sendError(res, 409, "Room is already booked for the selected dates");
    }

    await dbRun(
      `UPDATE bookings
       SET guest_name = ?, guest_email = ?, guest_phone = ?, room_id = ?, check_in = ?, check_out = ?
       WHERE id = ?`,
      [guest_name, guest_email, guest_phone, room_id, check_in, check_out, id]
    );

    if (existing.room_id !== room_id) {
      await syncRoomStatus(existing.room_id);
    }
    await syncRoomStatus(room_id);

    const booking = await dbGet(BOOKING_SELECT + " WHERE b.id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: booking
    });
  } catch (error) {
    return sendError(res, 500, "Failed to update booking");
  }
}

async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbGet("SELECT * FROM bookings WHERE id = ?", [id]);

    if (!existing) {
      return sendError(res, 404, "Booking not found");
    }

    if (existing.status === "Cancelled") {
      return sendError(res, 400, "Booking is already cancelled");
    }

    // Soft cancel: keep history, only change status.
    await dbRun("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [id]);
    await syncRoomStatus(existing.room_id);

    const booking = await dbGet(BOOKING_SELECT + " WHERE b.id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking
    });
  } catch (error) {
    return sendError(res, 500, "Failed to cancel booking");
  }
}

async function deleteBooking(req, res) {
  // DELETE is mapped to cancel so booking history is never permanently removed.
  return cancelBooking(req, res);
}

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking
};
