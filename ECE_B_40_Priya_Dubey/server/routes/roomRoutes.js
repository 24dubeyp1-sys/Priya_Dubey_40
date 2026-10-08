const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const { validateRoomBody, validateSearchQuery } = require("../middleware/validation");

// /search must be declared before /:id so "search" is not treated as an id.
router.get("/search", validateSearchQuery, roomController.searchAvailableRooms);
router.get("/", roomController.getAllRooms);
router.get("/:id", roomController.getRoomById);
router.post("/", validateRoomBody, roomController.createRoom);
router.put("/:id", validateRoomBody, roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

module.exports = router;
