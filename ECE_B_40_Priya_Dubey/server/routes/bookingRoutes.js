const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { validateBookingBody } = require("../middleware/validation");

router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBookingById);
router.post("/", validateBookingBody, bookingController.createBooking);
router.put("/:id", validateBookingBody, bookingController.updateBooking);
router.post("/:id/cancel", bookingController.cancelBooking);
router.delete("/:id", bookingController.deleteBooking);

module.exports = router;
