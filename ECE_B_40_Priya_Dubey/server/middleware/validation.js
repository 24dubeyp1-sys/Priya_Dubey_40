/**
 * validation.js
 * Shared input checks used by room and booking routes.
 */

const ALLOWED_ROOM_TYPES = ["Single", "Double", "Deluxe", "Suite"];
const ALLOWED_ROOM_STATUS = ["Available", "Booked"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function isValidDateString(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function validateRoomBody(req, res, next) {
  const { room_number, room_type, price, status } = req.body;

  if (!room_number || String(room_number).trim() === "") {
    return sendError(res, 400, "Room number is required");
  }

  if (!room_type || !ALLOWED_ROOM_TYPES.includes(room_type)) {
    return sendError(res, 400, "Room type must be Single, Double, Deluxe or Suite");
  }

  const numericPrice = Number(price);
  if (price === undefined || price === null || Number.isNaN(numericPrice) || numericPrice < 0) {
    return sendError(res, 400, "Price must be a number greater than or equal to 0");
  }

  if (status && !ALLOWED_ROOM_STATUS.includes(status)) {
    return sendError(res, 400, "Availability status must be Available or Booked");
  }

  req.body.room_number = String(room_number).trim();
  req.body.price = numericPrice;
  req.body.status = status || "Available";
  next();
}

function validateBookingBody(req, res, next) {
  const { guest_name, guest_email, guest_phone, room_id, check_in, check_out } = req.body;

  if (!guest_name || String(guest_name).trim() === "") {
    return sendError(res, 400, "Guest name is required");
  }

  if (!guest_email || !EMAIL_REGEX.test(String(guest_email).trim())) {
    return sendError(res, 400, "Guest email format is invalid");
  }

  if (!guest_phone || !PHONE_REGEX.test(String(guest_phone).trim())) {
    return sendError(res, 400, "Guest phone must be a 10-digit number");
  }

  if (!room_id || Number.isNaN(Number(room_id))) {
    return sendError(res, 400, "A valid room ID is required");
  }

  if (!check_in || !isValidDateString(check_in)) {
    return sendError(res, 400, "Check-in date is invalid. Use YYYY-MM-DD");
  }

  if (!check_out || !isValidDateString(check_out)) {
    return sendError(res, 400, "Check-out date is invalid. Use YYYY-MM-DD");
  }

  if (check_out <= check_in) {
    return sendError(res, 400, "Check-out date must be after check-in date");
  }

  req.body.guest_name = String(guest_name).trim();
  req.body.guest_email = String(guest_email).trim().toLowerCase();
  req.body.guest_phone = String(guest_phone).trim();
  req.body.room_id = Number(room_id);
  next();
}

function validateSearchQuery(req, res, next) {
  const { type, checkIn, checkOut } = req.query;

  if (type && !ALLOWED_ROOM_TYPES.includes(type)) {
    return sendError(res, 400, "Room type must be Single, Double, Deluxe or Suite");
  }

  if (!checkIn || !isValidDateString(checkIn)) {
    return sendError(res, 400, "Check-in date is invalid. Use YYYY-MM-DD");
  }

  if (!checkOut || !isValidDateString(checkOut)) {
    return sendError(res, 400, "Check-out date is invalid. Use YYYY-MM-DD");
  }

  if (checkOut <= checkIn) {
    return sendError(res, 400, "Check-out date must be after check-in date");
  }

  next();
}

module.exports = {
  ALLOWED_ROOM_TYPES,
  ALLOWED_ROOM_STATUS,
  validateRoomBody,
  validateBookingBody,
  validateSearchQuery,
  nightsBetween,
  sendError
};
