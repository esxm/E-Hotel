import { useState, useCallback } from 'react';
import { serviceResourceApi, serviceBookingApi } from '../lib/serviceResourceApi';

export const useServiceResources = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHotelServiceAnalytics = useCallback(async (hotelId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceResourceApi.getHotelServiceAnalytics(hotelId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch service analytics');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLowCapacityAlerts = useCallback(async (hotelId, threshold = 0.8) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceResourceApi.getLowCapacityAlerts(hotelId, threshold);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch capacity alerts');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkServiceCapacity = useCallback(async (hotelId, serviceId, requiredResources = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceResourceApi.checkServiceCapacity(hotelId, serviceId, requiredResources);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check service capacity');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateHotelServiceCapacity = useCallback(async (capacityId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceResourceApi.updateHotelServiceCapacity(capacityId, updateData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update service capacity');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createServiceBooking = useCallback(async (hotelId, bookingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceBookingApi.createServiceBooking(hotelId, bookingData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create service booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceBookings = useCallback(async (hotelId, customerId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceBookingApi.getServiceBookings(hotelId, customerId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch service bookings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelServiceBooking = useCallback(async (hotelId, serviceBookingId, cancelData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceBookingApi.cancelServiceBooking(hotelId, serviceBookingId, cancelData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel service booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    clearError,
    getHotelServiceAnalytics,
    getLowCapacityAlerts,
    checkServiceCapacity,
    updateHotelServiceCapacity,
    createServiceBooking,
    getServiceBookings,
    cancelServiceBooking,
  };
};

