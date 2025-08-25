const express = require("express");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const aiCtrl = require("../controllers/aiController");

const router = express.Router({ mergeParams: true });
router.use(auth);

// Receptionist, Manager, or Admin can request a cancellation-risk assessment for a booking
router.post(
  "/cancel-risk/:bookingId",
  role("Receptionist", "HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await aiCtrl.assessCancellationRisk(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Anomaly detection for a hotel's recent activity
router.get(
  "/anomalies/:hotelId",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await aiCtrl.detectAnomalies(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Revenue forecast & goal gap (AI summarized)
router.get(
  "/revenue-forecast",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await aiCtrl.revenueForecast(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Overbooking risk simulator
router.post(
  "/overbooking-sim",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await aiCtrl.overbookingSim(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

module.exports = router;


