const express = require("express");
const ServiceBookingController = require("../controllers/serviceBookingController");
const authenticateToken = require("../middleware/auth");
const role = require("../middleware/role");

const router = express.Router();

// Service Booking Routes
router.post("/hotels/:hotelId/service-bookings", 
  authenticateToken, 
  role("Customer", "Receptionist"), 
  ServiceBookingController.createServiceBooking
);

router.get("/hotels/:hotelId/service-bookings", 
  authenticateToken, 
  ServiceBookingController.getServiceBookings
);

router.get("/hotels/:hotelId/service-bookings/:serviceBookingID", 
  authenticateToken, 
  ServiceBookingController.getServiceBookingById
);

router.post("/hotels/:hotelId/service-bookings/:serviceBookingID/cancel", 
  authenticateToken, 
  role("Customer", "Receptionist"), 
  ServiceBookingController.cancelServiceBooking
);

module.exports = router;
