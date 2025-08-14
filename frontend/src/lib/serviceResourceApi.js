import api from './api';

// Service Resource Management API
export const serviceResourceApi = {
  // Get hotel service analytics
  getHotelServiceAnalytics: (hotelId) => {
    return api.get(`/service-resources/hotels/${hotelId}/analytics`);
  },

  // Get low capacity alerts
  getLowCapacityAlerts: (hotelId, threshold = 0.8) => {
    return api.get(`/service-resources/hotels/${hotelId}/alerts?threshold=${threshold}`);
  },

  // Check service capacity
  checkServiceCapacity: (hotelId, serviceId, requiredResources = {}) => {
    return api.post(`/service-resources/hotels/${hotelId}/services/${serviceId}/check-capacity`, {
      requiredResources
    });
  },

  // Update hotel service capacity
  updateHotelServiceCapacity: (capacityId, updateData) => {
    return api.put(`/service-resources/capacities/${capacityId}`, updateData);
  },

  // Get all hotel service capacities
  getAllHotelServiceCapacities: (hotelId) => {
    return api.get(`/service-resources/hotels/${hotelId}/capacities`);
  },

  // Get hotel service capacity for specific service
  getHotelServiceCapacity: (hotelId, serviceId) => {
    return api.get(`/service-resources/hotels/${hotelId}/services/${serviceId}/capacity`);
  },

  // Create hotel service capacity
  createHotelServiceCapacity: (hotelId, capacityData) => {
    return api.post(`/service-resources/hotels/${hotelId}/capacities`, capacityData);
  },

  // Reserve service resources
  reserveServiceResources: (hotelId, serviceId, reservationData) => {
    return api.post(`/service-resources/hotels/${hotelId}/services/${serviceId}/reserve`, reservationData);
  },

  // Release service resources
  releaseServiceResources: (hotelId, serviceId, releaseData) => {
    return api.post(`/service-resources/hotels/${hotelId}/services/${serviceId}/release`, releaseData);
  },

  // Setup hotel service capacities
  setupHotelServiceCapacities: (hotelId, setupData) => {
    return api.post(`/service-resources/hotels/${hotelId}/setup-capacities`, setupData);
  },

  // Get service resources for a specific service
  getServiceResources: (serviceId) => {
    return api.get(`/service-resources/services/${serviceId}/resources`);
  },

  // Create service resource
  createServiceResource: (resourceData) => {
    return api.post('/service-resources/resources', resourceData);
  },

  // Update service resource
  updateServiceResource: (resourceId, updateData) => {
    return api.put(`/service-resources/resources/${resourceId}`, updateData);
  },

  // Delete service resource
  deleteServiceResource: (resourceId) => {
    return api.delete(`/service-resources/resources/${resourceId}`);
  }
};

// Service Booking API
export const serviceBookingApi = {
  // Create service booking
  createServiceBooking: (hotelId, bookingData) => {
    return api.post(`/service-bookings/hotels/${hotelId}/service-bookings`, bookingData);
  },

  // Get service bookings
  getServiceBookings: (hotelId, customerId = null) => {
    const params = customerId ? { customerId } : {};
    return api.get(`/service-bookings/hotels/${hotelId}/service-bookings`, { params });
  },

  // Get service booking by ID
  getServiceBookingById: (hotelId, serviceBookingId) => {
    return api.get(`/service-bookings/hotels/${hotelId}/service-bookings/${serviceBookingId}`);
  },

  // Cancel service booking
  cancelServiceBooking: (hotelId, serviceBookingId, cancelData) => {
    return api.post(`/service-bookings/hotels/${hotelId}/service-bookings/${serviceBookingId}/cancel`, cancelData);
  }
}; 