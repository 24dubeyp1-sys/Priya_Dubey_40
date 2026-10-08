/**
 * roomController.js
 * CRUD for rooms + date-based availability search.
 */
const { dbAll, dbGet, dbRun } = require("../database");
const { nightsBetween, sendError } = require("../middleware/validation");

const ROOM_SELECT = `
  SELECT
    r.id,
    r.room_number,
    r.room_type,
    r.price,
    r.status,
    (
      SELECT COUNT(*)
      FROM bookings b
      WHERE b.room_id = r.id AND b.status = 'Confirmed'
    ) AS active_bookings
  FROM rooms r
`;

async function syncRoomStatus(roomId) {
  const row = await dbGet(
    "SELECT COUNT(*) AS count FROM bookings WHERE room_id = ? AND status = 'Confirmed'",
    [roomId]
  );

  const status = row.count > 0 ? "Booked" : "Available";
  await dbRun("UPDATE rooms SET status = ? WHERE id = ?", [status, roomId]);
  return status;
}

async function getAllRooms(req, res) {
  try {
    const { q, type } = req.query;
    let sql = ROOM_SELECT + " WHERE 1=1";
    const params = [];

    if (type) {
      sql += " AND r.room_type = ?";
      params.push(type);
    }

    if (q) {
      sql += " AND (r.room_number LIKE ? OR r.room_type LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY r.room_number";
    const rooms = await dbAll(sql, params);

    return res.status(200).json({
      success: true,
      message: "Rooms fetched successfully",
      data: rooms
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch rooms");
  }
}

async function getRoomById(req, res) {
  try {
    const room = await dbGet(ROOM_SELECT + " WHERE r.id = ?", [req.params.id]);
    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    return res.status(200).json({
      success: true,
      message: "Room fetched successfully",
      data: room
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch room");
  }
}

async function createRoom(req, res) {
  try {
    const { room_number, room_type, price, status } = req.body;

    const existing = await dbGet("SELECT id FROM rooms WHERE room_number = ?", [room_number]);
    if (existing) {
      return sendError(res, 409, "Room number must be unique");
    }

    const result = await dbRun(
      "INSERT INTO rooms (room_number, room_type, price, status) VALUES (?, ?, ?, ?)",
      [room_number, room_type, price, status]
    );

    const room = await dbGet(ROOM_SELECT + " WHERE r.id = ?", [result.lastID]);

    return res.status(201).json({
      success: true,
      message: "Room added successfully",
      data: room
    });
  } catch (error) {
    return sendError(res, 500, "Failed to add room");
  }
}

async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const { room_number, room_type, price, status } = req.body;

    const room = await dbGet("SELECT * FROM rooms WHERE id = ?", [id]);
    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    const duplicate = await dbGet(
      "SELECT id FROM rooms WHERE room_number = ? AND id != ?",
      [room_number, id]
    );
    if (duplicate) {
      return sendError(res, 409, "Room number must be unique");
    }

    await dbRun(
      "UPDATE rooms SET room_number = ?, room_type = ?, price = ?, status = ? WHERE id = ?",
      [room_number, room_type, price, status, id]
    );

    const updated = await dbGet(ROOM_SELECT + " WHERE r.id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: updated
    });
  } catch (error) {
    return sendError(res, 500, "Failed to update room");
  }
}

async function deleteRoom(req, res) {
  try {
    const { id } = req.params;
    const room = await dbGet("SELECT * FROM rooms WHERE id = ?", [id]);
    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    const active = await dbGet(
      "SELECT COUNT(*) AS count FROM bookings WHERE room_id = ? AND status = 'Confirmed'",
      [id]
    );

    if (active.count > 0) {
      return sendError(res, 409, "Cannot delete room because it has an active booking");
    }

    await dbRun("DELETE FROM rooms WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
      data: { id: Number(id) }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to delete room");
  }
}

/**
 * Date-based search does NOT trust rooms.status.
 * A room is available if it has no Confirmed booking that overlaps the requested dates.
 *
 * Overlap rule:
 * existing.check_in < requested_check_out
 * AND existing.check_out > requested_check_in
 */
async function searchAvailableRooms(req, res) {
  try {
    const { type, checkIn, checkOut } = req.query;
    const params = [checkIn, checkOut];

    let sql = `
      SELECT r.id, r.room_number, r.room_type, r.price, r.status
      FROM rooms r
      WHERE r.id NOT IN (
        SELECT b.room_id
        FROM bookings b
        WHERE b.status = 'Confirmed'
          AND b.check_in < ?
          AND b.check_out > ?
      )
    `;

    if (type) {
      sql += " AND r.room_type = ?";
      params.push(type);
    }

    sql += " ORDER BY r.room_number";

    const rooms = await dbAll(sql, params);
    const nights = nightsBetween(checkIn, checkOut);

    const data = rooms.map((room) => ({
      ...room,
      number_of_nights: nights,
      total_amount: nights * room.price
    }));

    return res.status(200).json({
      success: true,
      message: "Available rooms fetched successfully",
      data
    });
  } catch (error) {
    return sendError(res, 500, "Failed to search rooms");
  }
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  searchAvailableRooms,
  syncRoomStatus
};
