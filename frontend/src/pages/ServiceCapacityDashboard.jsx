import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { serviceResourceApi } from '../lib/serviceResourceApi';
import LoadingSpinner from '../components/LoadingSpinner';
import SuccessToast from '../components/SuccessToast';
import ErrorToast from '../components/ErrorToast';

const ServiceCapacityDashboard = () => {
  const { hotelId } = useParams();
  const { user, role } = useAuth();
  const [analytics, setAnalytics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showToast, setShowToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    console.log('ServiceCapacityDashboard mounted');
    console.log('Hotel ID:', hotelId);
    console.log('User:', user);
    console.log('Role:', role);
    
    if (user && hotelId) {
      loadDashboardData();
    }
  }, [hotelId, user, role]);

  const loadDashboardData = async () => {
    if (!user) {
      console.log('User not authenticated');
      setShowToast({ 
        show: true, 
        message: 'Please log in to access this page', 
        type: 'error' 
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Loading dashboard data for hotel:', hotelId);
      console.log('User authenticated:', !!user);
      console.log('User role:', role);
      
      const [analyticsRes, alertsRes] = await Promise.all([
        serviceResourceApi.getHotelServiceAnalytics(hotelId),
        serviceResourceApi.getLowCapacityAlerts(hotelId)
      ]);
      
      console.log('Analytics response:', analyticsRes);
      console.log('Alerts response:', alertsRes);
      
      setAnalytics(analyticsRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setShowToast({ 
        show: true, 
        message: `Failed to load dashboard data: ${error.response?.data?.error || error.message}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCapacityUpdate = async (capacityID, updateData) => {
    try {
      await serviceResourceApi.updateHotelServiceCapacity(capacityID, updateData);
      setShowToast({ show: true, message: 'Capacity updated successfully', type: 'success' });
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Error updating capacity:', error);
      setShowToast({ show: true, message: 'Failed to update capacity', type: 'error' });
    }
  };

  const getUtilizationColor = (rate) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (isAvailable) => {
    return isAvailable ? (
      <span className="text-green-500">●</span>
    ) : (
      <span className="text-red-500">●</span>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Capacity Dashboard</h1>
        <p className="text-gray-600">Monitor and manage service resources for Hotel {hotelId}</p>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-red-700 mb-4">⚠️ Capacity Alerts</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-red-800">{alert.serviceName}</h3>
                  {getStatusIcon(alert.isAvailable)}
                </div>
                <p className="text-red-700 text-sm">
                  Utilization: {alert.utilizationRate}% | 
                  Bookings: {alert.currentBookings}/{alert.maxConcurrentBookings}
                </p>
                {alert.availabilityNotes && (
                  <p className="text-red-600 text-xs mt-1">{alert.availabilityNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {analytics.map((service) => (
          <div key={service.serviceID} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{service.serviceName}</h3>
              {getStatusIcon(service.isAvailable)}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Category:</span>
                <span className="text-sm font-medium text-gray-900">{service.category}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bookings:</span>
                <span className="text-sm font-medium text-gray-900">
                  {service.currentBookings}/{service.maxConcurrentBookings}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Utilization:</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${getUtilizationColor(service.utilizationRate)}`}>
                  {service.utilizationRate}%
                </span>
              </div>

              {/* Resource Details */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Resources:</h4>
                <div className="space-y-1">
                  {Object.entries(service.resources).map(([resourceId, quantity]) => (
                    <div key={resourceId} className="flex justify-between text-xs">
                      <span className="text-gray-600">{resourceId}:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setSelectedService(service)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Manage Capacity
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Management Modal */}
      {selectedService && (
        <CapacityManagementModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onUpdate={handleCapacityUpdate}
        />
      )}

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

// Capacity Management Modal Component
const CapacityManagementModal = ({ service, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    maxConcurrentBookings: service.maxConcurrentBookings,
    isAvailable: service.isAvailable,
    availabilityNotes: service.availabilityNotes || '',
    resources: { ...service.resources }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(service.capacityID, formData);
    onClose();
  };

  const updateResource = (resourceId, value) => {
    setFormData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        [resourceId]: parseInt(value) || 0
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage {service.serviceName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Concurrent Bookings
            </label>
            <input
              type="number"
              value={formData.maxConcurrentBookings}
              onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentBookings: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Service Available</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability Notes
            </label>
            <textarea
              value={formData.availabilityNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, availabilityNotes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows="2"
              placeholder="e.g., Under maintenance, Seasonal availability..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Quantities
            </label>
            <div className="space-y-2">
              {Object.entries(formData.resources).map(([resourceId, quantity]) => (
                <div key={resourceId} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{resourceId}:</span>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => updateResource(resourceId, e.target.value)}
                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceCapacityDashboard;

