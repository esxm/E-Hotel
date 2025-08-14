/**
 * @class ServiceResource
 * @prop {string} resourceID
 * @prop {string} serviceID - The service this resource belongs to
 * @prop {string} resourceName - Name of the resource (e.g., "Staff", "Equipment", "Space")
 * @prop {string} resourceType - Type of resource ("staff", "equipment", "space", "material")
 * @prop {number} requiredQuantity - How much of this resource is needed per service instance
 * @prop {string} unit - Unit of measurement (e.g., "people", "items", "sq_meters", "hours")
 * @prop {string} description - Description of the resource requirement
 * @prop {boolean} isPerBooking - Whether this resource is consumed per booking or shared
 * @prop {number} maxConcurrentUsage - Maximum concurrent usage (for shared resources)
 */
class ServiceResource {
  constructor({
    resourceID,
    serviceID,
    resourceName,
    resourceType,
    requiredQuantity,
    unit,
    description = "",
    isPerBooking = true,
    maxConcurrentUsage = null,
  }) {
    this.resourceID = resourceID;
    this.serviceID = serviceID;
    this.resourceName = resourceName;
    this.resourceType = resourceType;
    this.requiredQuantity = requiredQuantity;
    this.unit = unit;
    this.description = description;
    this.isPerBooking = isPerBooking;
    this.maxConcurrentUsage = maxConcurrentUsage;
  }
}

module.exports = ServiceResource;

