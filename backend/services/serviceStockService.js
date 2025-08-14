const { db, admin } = require("../firebase");
const ServiceStock = require("../models/serviceStock");
const ServiceResource = require("../models/serviceResource");

const serviceStockCol = db.collection("serviceStock");
const serviceResourcesCol = db.collection("serviceResources");

class ServiceStockService {
  /**
   * Create a new service stock record
   * @param {Object} stockData - Stock data
   * @returns {ServiceStock} Created stock object
   */
  async createServiceStock(stockData) {
    try {
      const docRef = await serviceStockCol.add({
        ...stockData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await docRef.get();
      return new ServiceStock({ stockID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error creating service stock: ${error.message}`);
    }
  }

  /**
   * Get service stock for a specific hotel and service
   * @param {string} hotelID - Hotel ID
   * @param {string} serviceID - Service ID
   * @returns {ServiceStock|null} Stock object or null if not found
   */
  async getServiceStock(hotelID, serviceID) {
    try {
      const snapshot = await serviceStockCol
        .where("hotelID", "==", hotelID)
        .where("serviceID", "==", serviceID)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new ServiceStock({ stockID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error fetching service stock: ${error.message}`);
    }
  }

  /**
   * Get all service stocks for a hotel
   * @param {string} hotelID - Hotel ID
   * @returns {Array<ServiceStock>} Array of stock objects
   */
  async getAllHotelServiceStocks(hotelID) {
    try {
      const snapshot = await serviceStockCol
        .where("hotelID", "==", hotelID)
        .get();
      
      return snapshot.docs.map(doc => 
        new ServiceStock({ stockID: doc.id, ...doc.data() })
      );
    } catch (error) {
      throw new Error(`Error fetching hotel service stocks: ${error.message}`);
    }
  }

  /**
   * Update service stock
   * @param {string} stockID - Stock ID
   * @param {Object} updateData - Update data
   * @returns {ServiceStock} Updated stock object
   */
  async updateServiceStock(stockID, updateData) {
    try {
      await serviceStockCol.doc(stockID).update({
        ...updateData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await serviceStockCol.doc(stockID).get();
      return new ServiceStock({ stockID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error updating service stock: ${error.message}`);
    }
  }

  /**
   * Delete service stock
   * @param {string} stockID - Stock ID
   * @returns {Object} Success message
   */
  async deleteServiceStock(stockID) {
    try {
      await serviceStockCol.doc(stockID).delete();
      return { message: "Service stock deleted successfully" };
    } catch (error) {
      throw new Error(`Error deleting service stock: ${error.message}`);
    }
  }

  /**
   * Check stock availability for a service
   * @param {string} hotelID - Hotel ID
   * @param {string} serviceID - Service ID
   * @param {Object} requiredResources - Required resources
   * @returns {Object} Availability check result
   */
  async checkStockAvailability(hotelID, serviceID, requiredResources = {}) {
    try {
      const stock = await this.getServiceStock(hotelID, serviceID);
      
      if (!stock) {
        return {
          hasStock: false,
          missingResources: [{ message: "Service stock not configured" }],
          availableStock: {}
        };
      }

      return stock.checkStockAvailability(requiredResources);
    } catch (error) {
      throw new Error(`Error checking stock availability: ${error.message}`);
    }
  }

  /**
   * Reserve stock for a booking
   * @param {string} hotelID - Hotel ID
   * @param {string} serviceID - Service ID
   * @param {Object} requiredResources - Required resources
   * @param {string} bookingID - Booking ID
   * @returns {boolean} Success status
   */
  async reserveStock(hotelID, serviceID, requiredResources = {}, bookingID) {
    try {
      const stock = await this.getServiceStock(hotelID, serviceID);
      
      if (!stock) {
        throw new Error("Service stock not found");
      }

      const success = stock.reserveStock(requiredResources, bookingID);
      
      if (success) {
        // Update the stock in the database
        await this.updateServiceStock(stock.stockID, {
          reservedStock: stock.reservedStock,
          stockHistory: stock.stockHistory
        });
      }
      
      return success;
    } catch (error) {
      throw new Error(`Error reserving stock: ${error.message}`);
    }
  }

  /**
   * Release reserved stock
   * @param {string} hotelID - Hotel ID
   * @param {string} serviceID - Service ID
   * @param {Object} requiredResources - Resources to release
   * @param {string} bookingID - Booking ID
   * @returns {boolean} Success status
   */
  async releaseStock(hotelID, serviceID, requiredResources = {}, bookingID) {
    try {
      const stock = await this.getServiceStock(hotelID, serviceID);
      
      if (!stock) {
        throw new Error("Service stock not found");
      }

      const success = stock.releaseStock(requiredResources, bookingID);
      
      if (success) {
        // Update the stock in the database
        await this.updateServiceStock(stock.stockID, {
          reservedStock: stock.reservedStock,
          stockHistory: stock.stockHistory
        });
      }
      
      return success;
    } catch (error) {
      throw new Error(`Error releasing stock: ${error.message}`);
    }
  }

  /**
   * Update stock levels manually
   * @param {string} stockID - Stock ID
   * @param {Object} newInventory - New inventory levels
   * @param {string} reason - Reason for update
   * @returns {ServiceStock} Updated stock object
   */
  async updateStockLevels(stockID, newInventory, reason = "Manual update") {
    try {
      const stock = await this.getServiceStockById(stockID);
      
      if (!stock) {
        throw new Error("Service stock not found");
      }

      stock.updateStock(newInventory, reason);
      
      // Update the stock in the database
      return await this.updateServiceStock(stockID, {
        inventory: stock.inventory,
        stockHistory: stock.stockHistory
      });
    } catch (error) {
      throw new Error(`Error updating stock levels: ${error.message}`);
    }
  }

  /**
   * Get stock by ID
   * @param {string} stockID - Stock ID
   * @returns {ServiceStock|null} Stock object or null
   */
  async getServiceStockById(stockID) {
    try {
      const doc = await serviceStockCol.doc(stockID).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return new ServiceStock({ stockID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error fetching service stock by ID: ${error.message}`);
    }
  }

  /**
   * Get stock analytics for a hotel
   * @param {string} hotelID - Hotel ID
   * @returns {Array} Array of stock analytics
   */
  async getHotelStockAnalytics(hotelID) {
    try {
      const stocks = await this.getAllHotelServiceStocks(hotelID);
      const analytics = [];

      for (const stock of stocks) {
        const summary = stock.getStockSummary();
        const alerts = stock.getLowStockAlerts();
        
        analytics.push({
          stockID: stock.stockID,
          serviceID: stock.serviceID,
          hotelID: stock.hotelID,
          isActive: stock.isActive,
          stockSummary: summary,
          lowStockAlerts: alerts,
          lastUpdated: stock.lastUpdated,
          notes: stock.notes
        });
      }

      return analytics;
    } catch (error) {
      throw new Error(`Error fetching hotel stock analytics: ${error.message}`);
    }
  }

  /**
   * Get low stock alerts for a hotel
   * @param {string} hotelID - Hotel ID
   * @param {number} threshold - Utilization threshold
   * @returns {Array} Array of low stock alerts
   */
  async getLowStockAlerts(hotelID, threshold = 0.8) {
    try {
      const stocks = await this.getAllHotelServiceStocks(hotelID);
      const allAlerts = [];

      for (const stock of stocks) {
        const alerts = stock.getLowStockAlerts(threshold);
        allAlerts.push(...alerts.map(alert => ({
          ...alert,
          stockID: stock.stockID,
          serviceID: stock.serviceID,
          hotelID: stock.hotelID
        })));
      }

      return allAlerts;
    } catch (error) {
      throw new Error(`Error fetching low stock alerts: ${error.message}`);
    }
  }

  /**
   * Initialize stock for a service based on its resources
   * @param {string} hotelID - Hotel ID
   * @param {string} serviceID - Service ID
   * @param {Object} initialInventory - Initial inventory levels
   * @returns {ServiceStock} Created stock object
   */
  async initializeServiceStock(hotelID, serviceID, initialInventory = {}) {
    try {
      // Get service resources to understand what stock should be tracked
      const resourceSnapshot = await serviceResourcesCol
        .where("serviceID", "==", serviceID)
        .get();
      
      const resources = resourceSnapshot.docs.map(doc => 
        new ServiceResource({ resourceID: doc.id, ...doc.data() })
      );

      // Create default inventory if not provided
      const inventory = {};
      const maxCapacity = {};
      
      for (const resource of resources) {
        const resourceID = resource.resourceID;
        inventory[resourceID] = initialInventory[resourceID] || 
          (resource.maxConcurrentUsage || resource.requiredQuantity * 10);
        maxCapacity[resourceID] = resource.maxConcurrentUsage || inventory[resourceID];
      }

      const stockData = {
        hotelID,
        serviceID,
        inventory,
        maxCapacity,
        reservedStock: {},
        stockHistory: [],
        isActive: true,
        notes: "Auto-initialized stock"
      };

      return await this.createServiceStock(stockData);
    } catch (error) {
      throw new Error(`Error initializing service stock: ${error.message}`);
    }
  }

  /**
   * Get stock history for a service
   * @param {string} stockID - Stock ID
   * @param {number} limit - Number of history entries to return
   * @returns {Array} Array of history entries
   */
  async getStockHistory(stockID, limit = 50) {
    try {
      const stock = await this.getServiceStockById(stockID);
      
      if (!stock) {
        throw new Error("Service stock not found");
      }

      return stock.stockHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Error fetching stock history: ${error.message}`);
    }
  }
}

module.exports = new ServiceStockService();

