import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function UserManagement() {
  const { showLoading, hideLoading } = useLoading();
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [activeTab, setActiveTab] = useState('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      showLoading();
      const [customersRes, managersRes, receptionistsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/admin/managers'),
        api.get('/admin/receptionists')
      ]);
      setCustomers(customersRes.data || []);
      setManagers(managersRes.data || []);
      setReceptionists(receptionistsRes.data || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      hideLoading();
    }
  }

  const getFilteredAndSortedUsers = () => {
    let users = [];
    
    switch (activeTab) {
      case 'customers':
        users = customers;
        break;
      case 'managers':
        users = managers;
        break;
      case 'receptionists':
        users = receptionists;
        break;
      default:
        users = customers;
    }

    // Filter by search term
    if (searchTerm) {
      users = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber?.includes(searchTerm)
      );
    }

    // Sort users
    users.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return users;
  };

  const getCustomerStats = (customerId) => {
    // This would be implemented with real API calls
    return {
      totalBookings: Math.floor(Math.random() * 20) + 1,
      totalSpent: Math.floor(Math.random() * 5000) + 100,
      lastVisit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      loyaltyPoints: Math.floor(Math.random() * 1000) + 50
    };
  };

  const getManagerStats = (managerId) => {
    return {
      managedHotels: Math.floor(Math.random() * 3) + 1,
      totalRevenue: Math.floor(Math.random() * 100000) + 20000,
      employeeCount: Math.floor(Math.random() * 15) + 5,
      performanceRating: (Math.random() * 2 + 3).toFixed(1)
    };
  };

  const getReceptionistStats = (receptionistId) => {
    return {
      checkInsToday: Math.floor(Math.random() * 10) + 1,
      totalCheckIns: Math.floor(Math.random() * 500) + 100,
      customerSatisfaction: (Math.random() * 2 + 3).toFixed(1),
      shiftHours: Math.floor(Math.random() * 4) + 6
    };
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const filteredUsers = getFilteredAndSortedUsers();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        User Management
      </h2>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'customers'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">👥</span>
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('managers')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'managers'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">👨‍💼</span>
            Managers ({managers.length})
          </button>
          <button
            onClick={() => setActiveTab('receptionists')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'receptionists'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">👩‍💼</span>
            Receptionists ({receptionists.length})
          </button>
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="createdAt">Join Date</option>
              {activeTab === 'customers' && <option value="balance">Balance</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map(user => {
          let stats = {};
          let userType = '';
          
          if (activeTab === 'customers') {
            stats = getCustomerStats(user.customerID);
            userType = 'Customer';
          } else if (activeTab === 'managers') {
            stats = getManagerStats(user.managerID);
            userType = 'Manager';
          } else if (activeTab === 'receptionists') {
            stats = getReceptionistStats(user.receptionistID);
            userType = 'Receptionist';
          }

          return (
            <div key={user.customerID || user.managerID || user.receptionistID} 
                 className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                {/* User Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {userType} • {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </span>
                  </div>
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {activeTab === 'customers' && (
                    <>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.totalBookings}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bookings</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${stats.totalSpent}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {stats.loyaltyPoints}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loyalty Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {stats.lastVisit}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last Visit</p>
                      </div>
                    </>
                  )}

                  {activeTab === 'managers' && (
                    <>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.managedHotels}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Hotels</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${stats.totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {stats.employeeCount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {stats.performanceRating}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                      </div>
                    </>
                  )}

                  {activeTab === 'receptionists' && (
                    <>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.checkInsToday}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {stats.totalCheckIns}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Check-ins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {stats.customerSatisfaction}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {stats.shiftHours}h
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Shift</p>
                      </div>
                    </>
                  )}
                </div>

                {/* User Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user.phoneNumber || 'N/A'}
                    </span>
                  </div>
                  {activeTab === 'customers' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Balance:</span>
                      <span className={`font-medium ${
                        user.balance > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${user.balance || 0}
                      </span>
                    </div>
                  )}
                  {activeTab === 'customers' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">ID:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.idNumber || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md">
                    Edit
                  </button>
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-md">
                    View Details
                  </button>
                  <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-md">
                    History
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No users available in this category.'}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Customers</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👨‍💼</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Total Managers</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {managers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👩‍💼</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Receptionists</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {receptionists.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Active Users</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {customers.length + managers.length + receptionists.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
