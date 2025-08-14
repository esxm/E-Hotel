/**
 * @class Service
 * @prop {string} serviceID
 * @prop {string} name
 * @prop {number} cost
 * @prop {boolean} isOneTime - true if service is charged once, false if charged per use
 * @prop {string} description
 * @prop {Object} resourceRequirements - Object mapping resourceID to required quantity per booking
 * @prop {number} estimatedDuration - Estimated duration in minutes
 * @prop {string} category - Service category (e.g., "dining", "wellness", "transportation")
 * @prop {boolean} requiresBooking - Whether this service requires advance booking
 */
class Service {
  constructor({ 
    serviceID, 
    name, 
    cost, 
    isOneTime, 
    description,
    resourceRequirements = {},
    estimatedDuration = 60,
    category = "general",
    requiresBooking = false
  }) {
    this.serviceID = serviceID;
    this.name = name;
    this.cost = cost;
    this.isOneTime = isOneTime;
    this.description = description;
    this.resourceRequirements = resourceRequirements;
    this.estimatedDuration = estimatedDuration;
    this.category = category;
    this.requiresBooking = requiresBooking;
  }
}

module.exports = Service;
