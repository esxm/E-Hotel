const serviceResourceService = require("../services/serviceResourceService");

class ServiceResourceController {
  // Service Resource Management
  static async createServiceResource(req, res) {
    try {
      const resource = await serviceResourceService.createServiceResource(req.body);
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getServiceResources(req, res) {
    try {
      const { serviceID } = req.params;
      const resources = await serviceResourceService.getServiceResources(serviceID);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateServiceResource(req, res) {
    try {
      const { resourceID } = req.params;
      const resource = await serviceResourceService.updateServiceResource(resourceID, req.body);
      res.json(resource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteServiceResource(req, res) {
    try {
      const { resourceID } = req.params;
      const result = await serviceResourceService.deleteServiceResource(resourceID);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Hotel Service Capacity Management
  static async createHotelServiceCapacity(req, res) {
    try {
      const capacity = await serviceResourceService.createHotelServiceCapacity(req.body);
      res.status(201).json(capacity);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getHotelServiceCapacity(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const capacity = await serviceResourceService.getHotelServiceCapacity(hotelID, serviceID);
      
      if (!capacity) {
        return res.status(404).json({ error: "Service capacity not found for this hotel" });
      }
      
      res.json(capacity);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllHotelServiceCapacities(req, res) {
    try {
      const { hotelID } = req.params;
      const capacities = await serviceResourceService.getAllHotelServiceCapacities(hotelID);
      res.json(capacities);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateHotelServiceCapacity(req, res) {
    try {
      const { capacityID } = req.params;
      const capacity = await serviceResourceService.updateHotelServiceCapacity(capacityID, req.body);
      res.json(capacity);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Capacity Checking
  static async checkServiceCapacity(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources } = req.body;
      
      const capacityCheck = await serviceResourceService.checkServiceCapacity(
        hotelID, 
        serviceID, 
        requiredResources || {}
      );
      
      res.json(capacityCheck);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async reserveServiceResources(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources } = req.body;
      
      const success = await serviceResourceService.reserveServiceResources(
        hotelID, 
        serviceID, 
        requiredResources || {}
      );
      
      if (success) {
        res.json({ message: "Resources reserved successfully" });
      } else {
        res.status(400).json({ error: "Failed to reserve resources - insufficient capacity" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async releaseServiceResources(req, res) {
    try {
      const { hotelID, serviceID } = req.params;
      const { requiredResources } = req.body;
      
      await serviceResourceService.releaseServiceResources(
        hotelID, 
        serviceID, 
        requiredResources || {}
      );
      
      res.json({ message: "Resources released successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Analytics and Dashboard
  static async getHotelServiceAnalytics(req, res) {
    try {
      const { hotelID } = req.params;
      const analytics = await serviceResourceService.getHotelServiceAnalytics(hotelID);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getLowCapacityAlerts(req, res) {
    try {
      const { hotelID } = req.params;
      const { threshold } = req.query;
      
      const alerts = await serviceResourceService.getLowCapacityAlerts(
        hotelID, 
        threshold ? parseFloat(threshold) : 0.8
      );
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Bulk Operations
  static async setupHotelServiceCapacities(req, res) {
    try {
      const { hotelID, serviceCapacities } = req.body;
      
      if (!Array.isArray(serviceCapacities)) {
        return res.status(400).json({ error: "serviceCapacities must be an array" });
      }

      const results = [];
      for (const capacityData of serviceCapacities) {
        try {
          const capacity = await serviceResourceService.createHotelServiceCapacity({
            hotelID,
            ...capacityData
          });
          results.push({ success: true, capacity });
        } catch (error) {
          results.push({ success: false, error: error.message, serviceID: capacityData.serviceID });
        }
      }

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceResourceController;

