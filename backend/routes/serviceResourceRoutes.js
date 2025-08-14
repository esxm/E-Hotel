const express = require("express");
const ServiceResourceController = require("../controllers/serviceResourceController");
const authenticateToken = require("../middleware/auth");
const role = require("../middleware/role");

const router = express.Router();

// Service Resource Management Routes
router.post("/resources", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.createServiceResource
);

router.get("/services/:serviceID/resources", 
  authenticateToken, 
  ServiceResourceController.getServiceResources
);

router.put("/resources/:resourceID", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.updateServiceResource
);

router.delete("/resources/:resourceID", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.deleteServiceResource
);

// Hotel Service Capacity Management Routes
router.post("/hotels/:hotelID/capacities", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.createHotelServiceCapacity
);

router.get("/hotels/:hotelID/capacities", 
  authenticateToken, 
  ServiceResourceController.getAllHotelServiceCapacities
);

router.get("/hotels/:hotelID/services/:serviceID/capacity", 
  authenticateToken, 
  ServiceResourceController.getHotelServiceCapacity
);

router.put("/capacities/:capacityID", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.updateHotelServiceCapacity
);

// Capacity Checking Routes
router.post("/hotels/:hotelID/services/:serviceID/check-capacity", 
  authenticateToken, 
  ServiceResourceController.checkServiceCapacity
);

router.post("/hotels/:hotelID/services/:serviceID/reserve", 
  authenticateToken, 
  ServiceResourceController.reserveServiceResources
);

router.post("/hotels/:hotelID/services/:serviceID/release", 
  authenticateToken, 
  ServiceResourceController.releaseServiceResources
);

// Analytics and Dashboard Routes
router.get("/hotels/:hotelID/analytics", 
  authenticateToken, 
  role("HotelManager", "Receptionist", "SystemAdmin"), 
  ServiceResourceController.getHotelServiceAnalytics
);

router.get("/hotels/:hotelID/alerts", 
  authenticateToken, 
  role("HotelManager", "Receptionist", "SystemAdmin"), 
  ServiceResourceController.getLowCapacityAlerts
);

// Bulk Operations
router.post("/hotels/:hotelID/setup-capacities", 
  authenticateToken, 
  role("HotelManager", "SystemAdmin"), 
  ServiceResourceController.setupHotelServiceCapacities
);

module.exports = router;
