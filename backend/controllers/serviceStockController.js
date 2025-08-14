const serviceStockService = require("../services/serviceStockService");

class ServiceStockController {
  // Service Stock Management
  static async createServiceStock(req, res) {
    try {
      const stock = await serviceStockService.createServiceStock(req.body);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getServiceStock(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const stock = await serviceStockService.getServiceStock(hotelID, serviceID);
      
      if (!stock) {
        return res.status(404).json({ error: "Service stock not found" });
      }
      
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllHotelServiceStocks(req, res) {
    try {
      const { hotelID } = req.params;
      const stocks = await serviceStockService.getAllHotelServiceStocks(hotelID);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateServiceStock(req, res) {
    try {
      const { stockID } = req.params;
      const stock = await serviceStockService.updateServiceStock(stockID, req.body);
      res.json(stock);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteServiceStock(req, res) {
    try {
      const { stockID } = req.params;
      const result = await serviceStockService.deleteServiceStock(stockID);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Stock Availability and Management
  static async checkStockAvailability(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources } = req.body;
      
      const availability = await serviceStockService.checkStockAvailability(
        hotelID, 
        serviceID, 
        requiredResources || {}
      );
      
      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async reserveStock(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources, bookingID } = req.body;
      
      if (!bookingID) {
        return res.status(400).json({ error: "Booking ID is required" });
      }
      
      const success = await serviceStockService.reserveStock(
        hotelID, 
        serviceID, 
        requiredResources || {}, 
        bookingID
      );
      
      if (success) {
        res.json({ message: "Stock reserved successfully" });
      } else {
        res.status(400).json({ error: "Failed to reserve stock - insufficient availability" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async releaseStock(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources, bookingID } = req.body;
      
      if (!bookingID) {
        return res.status(400).json({ error: "Booking ID is required" });
      }
      
      await serviceStockService.releaseStock(
        hotelID, 
        serviceID, 
        requiredResources || {}, 
        bookingID
      );
      
      res.json({ message: "Stock released successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateStockLevels(req, res) {
    try {
      const { stockID } = req.params;
      const { newInventory, reason } = req.body;
      
      if (!newInventory) {
        return res.status(400).json({ error: "New inventory levels are required" });
      }
      
      const stock = await serviceStockService.updateStockLevels(
        stockID, 
        newInventory, 
        reason || "Manual update"
      );
      
      res.json(stock);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Analytics and Reporting
  static async getHotelStockAnalytics(req, res) {
    try {
      const { hotelID } = req.params;
      const analytics = await serviceStockService.getHotelStockAnalytics(hotelID);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getLowStockAlerts(req, res) {
    try {
      const { hotelID } = req.params;
      const { threshold } = req.query;
      
      const alerts = await serviceStockService.getLowStockAlerts(
        hotelID, 
        threshold ? parseFloat(threshold) : 0.8
      );
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getStockHistory(req, res) {
    try {
      const { stockID } = req.params;
      const { limit } = req.query;
      
      const history = await serviceStockService.getStockHistory(
        stockID, 
        limit ? parseInt(limit) : 50
      );
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Initialization
  static async initializeServiceStock(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { initialInventory } = req.body;
      
      const stock = await serviceStockService.initializeServiceStock(
        hotelID, 
        serviceID, 
        initialInventory || {}
      );
      
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Bulk Operations
  static async initializeAllHotelStocks(req, res) {
    try {
      const { hotelID } = req.params;
      const { serviceIDs } = req.body;
      
      if (!Array.isArray(serviceIDs)) {
        return res.status(400).json({ error: "serviceIDs must be an array" });
      }

      const results = [];
      for (const serviceID of serviceIDs) {
        try {
          const stock = await serviceStockService.initializeServiceStock(hotelID, serviceID);
          results.push({ success: true, stock });
        } catch (error) {
          results.push({ success: false, error: error.message, serviceID });
        }
      }

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceStockController;

