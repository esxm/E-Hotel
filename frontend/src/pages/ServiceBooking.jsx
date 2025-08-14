import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { serviceResourceApi, serviceBookingApi } from '../lib/serviceResourceApi';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SuccessToast from '../components/SuccessToast';
import ErrorToast from '../components/ErrorToast';

const ServiceBooking = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [capacityCheck, setCapacityCheck] = useState(null);
  const [showToast, setShowToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    loadHotelServices();
  }, [hotelId]);

  const loadHotelServices = async () => {
    try {
      setLoading(true);
      // Get hotel details to find available services
      const hotelResponse = await api.get(`/hotels/${hotelId}`);
      const hotel = hotelResponse.data;
      
      if (hotel.availableServiceIDs && hotel.availableServiceIDs.length > 0) {
        // Get service details for each available service
        const servicePromises = hotel.availableServiceIDs.map(serviceId =>
          api.get(`/services/${serviceId}`)
        );
        const serviceResponses = await Promise.all(servicePromises);
        const servicesData = serviceResponses.map(response => response.data);
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error loading hotel services:', error);
      setShowToast({ show: true, message: 'Failed to load hotel services', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkCapacity = async () => {
    if (!selectedService || !bookingDate || !bookingTime) {
      setShowToast({ show: true, message: 'Please select a service, date, and time', type: 'error' });
      return;
    }

    try {
      setBookingLoading(true);
      const response = await serviceResourceApi.checkServiceCapacity(
        hotelId,
        selectedService.serviceID,
        selectedService.resourceRequirements || {}
      );
      
      setCapacityCheck(response.data);
    } catch (error) {
      console.error('Error checking capacity:', error);
      setShowToast({ show: true, message: 'Failed to check service capacity', type: 'error' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      setShowToast({ show: true, message: 'Please log in to book services', type: 'error' });
      return;
    }

    if (!capacityCheck?.hasCapacity) {
      setShowToast({ show: true, message: 'Service is not available at this time', type: 'error' });
      return;
    }

    try {
      setBookingLoading(true);
      const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
      
      const bookingData = {
        customerID: user.uid,
        serviceID: selectedService.serviceID,
        bookingDate: bookingDateTime.toISOString(),
        requiredResources: selectedService.resourceRequirements || {},
        notes: notes.trim() || undefined
      };

      await serviceBookingApi.createServiceBooking(hotelId, bookingData);
      
      setShowToast({ show: true, message: 'Service booked successfully!', type: 'success' });
      
      // Reset form
      setSelectedService(null);
      setBookingDate('');
      setBookingTime('');
      setNotes('');
      setCapacityCheck(null);
      
      // Redirect to my bookings after a short delay
      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
      
    } catch (error) {
      console.error('Error booking service:', error);
      setShowToast({ show: true, message: error.response?.data?.error || 'Failed to book service', type: 'error' });
    } finally {
      setBookingLoading(false);
    }
  };

  const getServiceIcon = (category) => {
    const icons = {
      'dining': '🍽️',
      'wellness': '🧘',
      'fitness': '💪',
      'entertainment': '🎮',
      'transportation': '🚗',
      'business': '💼',
      'default': '✨'
    };
    return icons[category] || icons.default;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Hotel Services</h1>
          <p className="text-gray-600">Select and book services for Hotel {hotelId}</p>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏨</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Services Available</h2>
            <p className="text-gray-500">This hotel doesn't have any services available for booking.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Service Selection */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Services</h2>
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.serviceID}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedService?.serviceID === service.serviceID
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getServiceIcon(service.category)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{service.name}</h3>
                            <p className="text-sm text-gray-600 capitalize">{service.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{formatPrice(service.cost)}</div>
                          <div className="text-xs text-gray-500">
                            {service.estimatedDuration} min
                          </div>
                        </div>
                      </div>
                      
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
                
                {selectedService ? (
                  <div className="space-y-4">
                    {/* Selected Service Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getServiceIcon(selectedService.category)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedService.name}</h3>
                          <p className="text-sm text-gray-600">{formatPrice(selectedService.cost)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Date and Time Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="3"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Any special requests or notes..."
                      />
                    </div>

                    {/* Capacity Check Button */}
                    <button
                      onClick={checkCapacity}
                      disabled={!bookingDate || !bookingTime || bookingLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {bookingLoading ? 'Checking...' : 'Check Availability'}
                    </button>

                    {/* Capacity Check Result */}
                    {capacityCheck && (
                      <div className={`p-4 rounded-lg border ${
                        capacityCheck.hasCapacity 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {capacityCheck.hasCapacity ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                          <span className={`font-medium ${
                            capacityCheck.hasCapacity ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {capacityCheck.hasCapacity ? 'Available' : 'Not Available'}
                          </span>
                        </div>
                        <p className={`text-sm ${
                          capacityCheck.hasCapacity ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {capacityCheck.message}
                        </p>
                        
                        {!capacityCheck.hasCapacity && capacityCheck.missingResources && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-red-700 mb-1">Missing Resources:</p>
                            <ul className="text-sm text-red-600 space-y-1">
                              {capacityCheck.missingResources.map((resource, index) => (
                                <li key={index}>• {resource.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Book Button */}
                    {capacityCheck?.hasCapacity && (
                      <button
                        onClick={handleBooking}
                        disabled={bookingLoading}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {bookingLoading ? 'Booking...' : `Book ${selectedService.name} - ${formatPrice(selectedService.cost)}`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>Select a service to book</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {showToast.show && (
        showToast.type === 'success' ? (
          <SuccessToast message={showToast.message} onClose={() => setShowToast({ show: false, message: '', type: '' })} />
        ) : (
          <ErrorToast message={showToast.message} onClose={() => setShowToast({ show: false, message: '', type: '' })} />
        )
      )}
    </div>
  );
};

export default ServiceBooking;

