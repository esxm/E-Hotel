import React, { useState } from 'react';

const ServiceBookingCard = ({ booking, onCancel }) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceIcon = (serviceName) => {
    const icons = {
      'spa': '🧘',
      'gym': '💪',
      'restaurant': '🍽️',
      'pool': '🏊',
      'wifi': '📶',
      'parking': '🚗',
      'laundry': '👕',
      'room service': '🛎️',
      'default': '✨'
    };
    
    const serviceLower = serviceName.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (serviceLower.includes(key)) {
        return icon;
      }
    }
    return icons.default;
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this service booking?')) {
      setIsCancelling(true);
      try {
        await onCancel(booking.hotelID, booking.serviceBookingID);
      } finally {
        setIsCancelling(false);
      }
    }
  };

  const canCancel = booking.status === 'confirmed' && new Date(booking.bookingDate) > new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getServiceIcon(booking.serviceName || 'service')}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {booking.serviceName || 'Hotel Service'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hotel {booking.hotelID}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Booking Date:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(booking.bookingDate)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Cost:</span>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatPrice(booking.cost)}
          </span>
        </div>

        {booking.paymentStatus && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Payment:</span>
            <span className={`text-sm font-medium ${
              booking.paymentStatus === 'paid' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {booking.paymentStatus}
            </span>
          </div>
        )}

        {booking.notes && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Notes:</span> {booking.notes}
            </p>
          </div>
        )}
      </div>

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
        </button>
      )}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Booking ID: {booking.serviceBookingID}
      </div>
    </div>
  );
};

export default ServiceBookingCard;

