/**
 * dashboardController.js
 * Returns summary numbers for the dashboard cards.
 */
const { dbGet, dbRun } = require("../database");
const { sendError } = require("../middleware/validation");

async function getStats(req, res) {
  try {
    await dbRun(
      `UPDATE bookings
       SET status = 'Completed'
       WHERE status = 'Confirmed'
         AND date(check_out) <= date('now')`
    );

    const totalRooms = await dbGet("SELECT COUNT(*) AS count FROM rooms");
    const bookedRooms = await dbGet(
      `SELECT COUNT(DISTINCT room_id) AS count
       FROM bookings
       WHERE status = 'Confirmed'`
    );
    const totalBookings = await dbGet("SELECT COUNT(*) AS count FROM bookings");
    const cancelledBookings = await dbGet(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Cancelled'"
    );

    const availableRooms = totalRooms.count - bookedRooms.count;

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalRooms: totalRooms.count,
        availableRooms,
        bookedRooms: bookedRooms.count,
        totalBookings: totalBookings.count,
        cancelledBookings: cancelledBookings.count
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch dashboard stats");
  }
}

module.exports = { getStats };
