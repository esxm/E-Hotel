import React from 'react';

export default function AdminOverview({ health, systemStats }) {
  const getStatusColor = (status) => {
    return status ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = (status) => {
    return status ? "Online" : "Offline";
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        System Overview
      </h2>
      
      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${getStatusColor(health)} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">System Status</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {getStatusText(health)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🏨</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Hotels</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {systemStats.totalHotels || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Customers</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {systemStats.totalCustomers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Total Revenue</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                ${(systemStats.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Total Bookings</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                {systemStats.totalBookings || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Occupancy Rate</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {systemStats.occupancyRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Room Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🟢</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Available Rooms</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStats.availableRooms || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🔴</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Occupied Rooms</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStats.occupiedRooms || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🟡</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStats.maintenanceRooms || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👤</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Checked In</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStats.checkedInGuests || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      {health && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-300">Environment:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {health.environment}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Uptime:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {Math.round(health.uptime)} seconds
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Last Updated:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {new Date(health.timestamp).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Recent Bookings:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {systemStats.recentBookings || 0} (30 days)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
