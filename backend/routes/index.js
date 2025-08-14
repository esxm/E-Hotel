// routes/index.js
const express = require("express");
const hotelRoutes = require("./hotelRoutes");
const customerRoutes = require("./customerRoutes");
const hotelManagerRoutes = require("./hotelManagerRoutes");
const receptionistRoutes = require("./receptionistRoutes");
const accountRoutes = require("./accountRoutes");
const roomRoutes = require("./roomRoutes");
const statRoutes = require("./statRoutes");
const checkRoutes = require("./checkRoutes");
const invoiceRoutes = require("./invoiceRoutes");
const serviceResourceRoutes = require("./serviceResourceRoutes");
const serviceBookingRoutes = require("./serviceBookingRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

router.use("/hotels", hotelRoutes);
router.use("/customers", customerRoutes);
router.use("/managers", hotelManagerRoutes);
router.use("/receptionists", receptionistRoutes);
router.use("/accounts", accountRoutes);
router.use("/rooms", roomRoutes);
router.use("/stats", statRoutes);
router.use("/check", checkRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/service-resources", serviceResourceRoutes);
router.use("/service-bookings", serviceBookingRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
