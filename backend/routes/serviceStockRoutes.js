const express = require("express");
const ServiceStockController = require("../controllers/serviceStockController");
const authenticateToken = require("../middleware/auth");
const role = require("../middleware/role");

const router = express.Router();

// Service Stock Management Routes
router.post("/stocks", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.createServiceStock
);

router.get("/hotels/:hotelID/stocks", 
  authenticateToken, 
  ServiceStockController.getAllHotelServiceStocks
);

router.get("/hotels/:hotelID/services/:serviceID/stock", 
  authenticateToken, 
  ServiceStockController.getServiceStock
);

router.put("/stocks/:stockID", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.updateServiceStock
);

router.delete("/stocks/:stockID", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.deleteServiceStock
);

// Stock Availability and Management Routes
router.post("/hotels/:hotelID/services/:serviceID/check-stock", 
  authenticateToken, 
  ServiceStockController.checkStockAvailability
);

router.post("/hotels/:hotelID/services/:serviceID/reserve-stock", 
  authenticateToken, 
  ServiceStockController.reserveStock
);

router.post("/hotels/:hotelID/services/:serviceID/release-stock", 
  authenticateToken, 
  ServiceStockController.releaseStock
);

router.put("/stocks/:stockID/levels", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.updateStockLevels
);

// Analytics and Reporting Routes
router.get("/hotels/:hotelID/stock-analytics", 
  authenticateToken, 
  role("HotelManager", "Receptionist", "SystemAdmin"), 
  ServiceStockController.getHotelStockAnalytics
);

router.get("/hotels/:hotelID/stock-alerts", 
  authenticateToken, 
  role("HotelManager", "Receptionist", "SystemAdmin"), 
  ServiceStockController.getLowStockAlerts
);

router.get("/stocks/:stockID/history", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.getStockHistory
);

// Initialization Routes
router.post("/hotels/:hotelID/services/:serviceID/initialize-stock", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.initializeServiceStock
);

router.post("/hotels/:hotelID/initialize-all-stocks", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceStockController.initializeAllHotelStocks
);

module.exports = router;

