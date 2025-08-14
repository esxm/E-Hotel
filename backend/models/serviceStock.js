/**
 * @class ServiceStock
 * @prop {string} stockID
 * @prop {string} hotelID - The hotel this stock belongs to
 * @prop {string} serviceID - The service this stock is for
 * @prop {Object} inventory - Object mapping resourceID to current stock levels
 * @prop {Object} maxCapacity - Object mapping resourceID to maximum capacity
 * @prop {Object} reservedStock - Object mapping resourceID to currently reserved quantity
 * @prop {Object} stockHistory - Array of stock transactions
 * @prop {boolean} isActive - Whether this stock tracking is active
 * @prop {string} lastUpdated - When this stock was last updated
 * @prop {string} notes - Additional notes about stock status
 */
class ServiceStock {
  constructor({
    stockID, hotelID, serviceID, inventory = {}, maxCapacity = {}, 
    reservedStock = {}, stockHistory = [], isActive = true, 
    lastUpdated = new Date(), notes = ""
  }) {
    this.stockID = stockID;
    this.hotelID = hotelID;
    this.serviceID = serviceID;
    this.inventory = inventory;
    this.maxCapacity = maxCapacity;
    this.reservedStock = reservedStock;
    this.stockHistory = stockHistory;
    this.isActive = isActive;
    this.lastUpdated = lastUpdated;
    this.notes = notes;
  }

  /**
   * Get available stock for a specific resource
   * @param {string} resourceID - The resource to check
   * @returns {number} Available quantity
   */
  getAvailableStock(resourceID) {
    const currentStock = this.inventory[resourceID] || 0;
    const reserved = this.reservedStock[resourceID] || 0;
    return Math.max(0, currentStock - reserved);
  }

  /**
   * Get total stock for a specific resource
   * @param {string} resourceID - The resource to check
   * @returns {number} Total quantity
   */
  getTotalStock(resourceID) {
    return this.inventory[resourceID] || 0;
  }

  /**
   * Get utilization percentage for a specific resource
   * @param {string} resourceID - The resource to check
   * @returns {number} Utilization percentage (0-100)
   */
  getUtilizationRate(resourceID) {
    const total = this.getTotalStock(resourceID);
    const reserved = this.reservedStock[resourceID] || 0;
    return total > 0 ? (reserved / total) * 100 : 0;
  }

  /**
   * Check if there's enough stock available
   * @param {Object} requiredResources - Object mapping resourceID to required quantity
   * @returns {Object} Result with hasStock, missingResources, and availableStock
   */
  checkStockAvailability(requiredResources = {}) {
    const result = {
      hasStock: true,
      missingResources: [],
      availableStock: {}
    };

    for (const [resourceID, requiredQuantity] of Object.entries(requiredResources)) {
      const available = this.getAvailableStock(resourceID);
      result.availableStock[resourceID] = available;

      if (available < requiredQuantity) {
        result.hasStock = false;
        result.missingResources.push({
          resourceID,
          required: requiredQuantity,
          available: available,
          message: `Insufficient ${resourceID}: need ${requiredQuantity}, have ${available}`
        });
      }
    }

    return result;
  }

  /**
   * Reserve stock for a booking
   * @param {Object} requiredResources - Object mapping resourceID to required quantity
   * @param {string} bookingID - The booking ID for tracking
   * @returns {boolean} Success status
   */
  reserveStock(requiredResources = {}, bookingID) {
    const availability = this.checkStockAvailability(requiredResources);
    
    if (!availability.hasStock) {
      return false;
    }

    // Reserve the stock
    for (const [resourceID, quantity] of Object.entries(requiredResources)) {
      this.reservedStock[resourceID] = (this.reservedStock[resourceID] || 0) + quantity;
    }

    // Add to history
    this.stockHistory.push({
      timestamp: new Date(),
      type: 'reserve',
      bookingID,
      resources: requiredResources,
      previousReserved: { ...this.reservedStock }
    });

    this.lastUpdated = new Date();
    return true;
  }

  /**
   * Release reserved stock
   * @param {Object} requiredResources - Object mapping resourceID to quantity to release
   * @param {string} bookingID - The booking ID for tracking
   * @returns {boolean} Success status
   */
  releaseStock(requiredResources = {}, bookingID) {
    let success = true;

    for (const [resourceID, quantity] of Object.entries(requiredResources)) {
      const currentReserved = this.reservedStock[resourceID] || 0;
      const newReserved = Math.max(0, currentReserved - quantity);
      this.reservedStock[resourceID] = newReserved;
    }

    // Add to history
    this.stockHistory.push({
      timestamp: new Date(),
      type: 'release',
      bookingID,
      resources: requiredResources,
      previousReserved: { ...this.reservedStock }
    });

    this.lastUpdated = new Date();
    return success;
  }

  /**
   * Update stock levels (for manual adjustments)
   * @param {Object} newInventory - New inventory levels
   * @param {string} reason - Reason for the update
   * @returns {boolean} Success status
   */
  updateStock(newInventory, reason = "Manual update") {
    const previousInventory = { ...this.inventory };
    
    // Update inventory
    for (const [resourceID, quantity] of Object.entries(newInventory)) {
      this.inventory[resourceID] = Math.max(0, quantity);
    }

    // Add to history
    this.stockHistory.push({
      timestamp: new Date(),
      type: 'update',
      reason,
      previousInventory,
      newInventory: { ...this.inventory }
    });

    this.lastUpdated = new Date();
    return true;
  }

  /**
   * Get stock summary for all resources
   * @returns {Object} Summary with total, reserved, available, and utilization for each resource
   */
  getStockSummary() {
    const summary = {};
    
    for (const resourceID of Object.keys(this.inventory)) {
      summary[resourceID] = {
        total: this.getTotalStock(resourceID),
        reserved: this.reservedStock[resourceID] || 0,
        available: this.getAvailableStock(resourceID),
        utilization: this.getUtilizationRate(resourceID)
      };
    }

    return summary;
  }

  /**
   * Get low stock alerts
   * @param {number} threshold - Utilization threshold (0-1)
   * @returns {Array} Array of low stock alerts
   */
  getLowStockAlerts(threshold = 0.8) {
    const alerts = [];
    
    for (const [resourceID, quantity] of Object.entries(this.inventory)) {
      const utilization = this.getUtilizationRate(resourceID) / 100;
      
      if (utilization >= threshold) {
        alerts.push({
          resourceID,
          currentStock: this.getTotalStock(resourceID),
          reserved: this.reservedStock[resourceID] || 0,
          available: this.getAvailableStock(resourceID),
          utilization: this.getUtilizationRate(resourceID),
          message: `${resourceID} is ${Math.round(this.getUtilizationRate(resourceID))}% utilized`
        });
      }
    }

    return alerts;
  }
}

module.exports = ServiceStock;

