/**
 * @class HotelServiceCapacity
 * @prop {string} capacityID
 * @prop {string} hotelID - The hotel this capacity belongs to
 * @prop {string} serviceID - The service this capacity is for
 * @prop {Object} resources - Object mapping resourceID to available quantity
 * @prop {number} maxConcurrentBookings - Maximum number of concurrent bookings for this service
 * @prop {number} currentBookings - Current number of active bookings for this service
 * @prop {boolean} isAvailable - Whether this service is currently available at this hotel
 * @prop {string} availabilityNotes - Notes about availability (e.g., "Under maintenance", "Seasonal")
 * @prop {Date} lastUpdated - When this capacity was last updated
 */
class HotelServiceCapacity {
  constructor({
    capacityID,
    hotelID,
    serviceID,
    resources = {},
    maxConcurrentBookings = 10,
    currentBookings = 0,
    isAvailable = true,
    availabilityNotes = "",
    lastUpdated = new Date(),
  }) {
    this.capacityID = capacityID;
    this.hotelID = hotelID;
    this.serviceID = serviceID;
    this.resources = resources;
    this.maxConcurrentBookings = maxConcurrentBookings;
    this.currentBookings = currentBookings;
    this.isAvailable = isAvailable;
    this.availabilityNotes = availabilityNotes;
    this.lastUpdated = lastUpdated;
  }

  /**
   * Check if the service has enough resources for a new booking
   * @param {Object} requiredResources - Object mapping resourceID to required quantity
   * @returns {Object} - { hasCapacity: boolean, missingResources: Array, message: string }
   */
  checkCapacity(requiredResources = {}) {
    const missingResources = [];
    let hasCapacity = true;

    // Check if we're at max concurrent bookings
    if (this.currentBookings >= this.maxConcurrentBookings) {
      hasCapacity = false;
      missingResources.push({
        resourceName: "Booking Slots",
        required: 1,
        available: 0,
        message: `Maximum concurrent bookings (${this.maxConcurrentBookings}) reached`
      });
    }

    // Check each required resource
    for (const [resourceID, requiredQuantity] of Object.entries(requiredResources)) {
      const availableQuantity = this.resources[resourceID] || 0;
      
      if (availableQuantity < requiredQuantity) {
        hasCapacity = false;
        missingResources.push({
          resourceID,
          required: requiredQuantity,
          available: availableQuantity,
          message: `Insufficient ${resourceID}: required ${requiredQuantity}, available ${availableQuantity}`
        });
      }
    }

    return {
      hasCapacity,
      missingResources,
      message: hasCapacity 
        ? "Service has sufficient capacity" 
        : `Service lacks capacity: ${missingResources.map(r => r.message).join(', ')}`
    };
  }

  /**
   * Reserve resources for a booking
   * @param {Object} requiredResources - Object mapping resourceID to required quantity
   * @returns {boolean} - Whether reservation was successful
   */
  reserveResources(requiredResources = {}) {
    const capacityCheck = this.checkCapacity(requiredResources);
    
    if (!capacityCheck.hasCapacity) {
      return false;
    }

    // Reserve the resources
    for (const [resourceID, requiredQuantity] of Object.entries(requiredResources)) {
      this.resources[resourceID] = (this.resources[resourceID] || 0) - requiredQuantity;
    }

    this.currentBookings += 1;
    this.lastUpdated = new Date();
    
    return true;
  }

  /**
   * Release resources when a booking is cancelled or completed
   * @param {Object} requiredResources - Object mapping resourceID to required quantity
   */
  releaseResources(requiredResources = {}) {
    // Release the resources
    for (const [resourceID, requiredQuantity] of Object.entries(requiredResources)) {
      this.resources[resourceID] = (this.resources[resourceID] || 0) + requiredQuantity;
    }

    this.currentBookings = Math.max(0, this.currentBookings - 1);
    this.lastUpdated = new Date();
  }
}

module.exports = HotelServiceCapacity;

