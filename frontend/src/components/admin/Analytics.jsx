import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function Analytics() {
  const { showLoading, hideLoading } = useLoading();
  const [analyticsData, setAnalyticsData] = useState({
    revenue: {
      daily: [],
      monthly: [],
      yearly: []
    },
    occupancy: {
      daily: [],
      monthly: [],
      yearly: []
    },
    bookings: {
      daily: [],
      monthly: [],
      yearly: []
    }
  });
  const [timeRange, setTimeRange] = useState('monthly');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  async function loadAnalyticsData() {
    try {
      showLoading();
      // In a real implementation, you would fetch analytics data from the API
      // For now, we'll generate mock data
      const mockData = generateMockAnalyticsData(timeRange);
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      hideLoading();
    }
  }

  const generateMockAnalyticsData = (range) => {
    const data = {
      revenue: { daily: [], monthly: [], yearly: [] },
      occupancy: { daily: [], monthly: [], yearly: [] },
      bookings: { daily: [], monthly: [], yearly: [] }
    };

    const now = new Date();
    const periods = range === 'daily' ? 30 : range === 'monthly' ? 12 : 5;

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date(now);
      if (range === 'daily') {
        date.setDate(date.getDate() - i);
      } else if (range === 'monthly') {
        date.setMonth(date.getMonth() - i);
      } else {
        date.setFullYear(date.getFullYear() - i);
      }

      const label = range === 'daily' 
        ? date.toLocaleDateString() 
        : range === 'monthly' 
        ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : date.getFullYear().toString();

      data.revenue[range].push({
        label,
        value: Math.floor(Math.random() * 50000) + 10000,
        change: (Math.random() - 0.5) * 20
      });

      data.occupancy[range].push({
        label,
        value: Math.floor(Math.random() * 40) + 60,
        change: (Math.random() - 0.5) * 10
      });

      data.bookings[range].push({
        label,
        value: Math.floor(Math.random() * 200) + 50,
        change: (Math.random() - 0.5) * 15
      });
    }

    return data;
  };

  const getMetricData = () => {
    return analyticsData[selectedMetric][timeRange] || [];
  };

  const getMetricInfo = () => {
    const data = getMetricData();
    if (data.length === 0) return { total: 0, change: 0, avg: 0 };

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const avg = total / data.length;
    const change = data.length > 1 ? data[data.length - 1].change : 0;

    return { total, change, avg };
  };

  const formatValue = (value, metric) => {
    if (metric === 'revenue') {
      return `$${value.toLocaleString()}`;
    } else if (metric === 'occupancy') {
      return `${value.toFixed(1)}%`;
    } else {
      return value.toLocaleString();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Analytics Dashboard</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="revenue">Revenue</option>
              <option value="occupancy">Occupancy Rate</option>
              <option value="bookings">Bookings</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="daily">Daily (30 days)</option>
              <option value="monthly">Monthly (12 months)</option>
              <option value="yearly">Yearly (5 years)</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatValue(getMetricInfo().total, selectedMetric)}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Average
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatValue(getMetricInfo().avg, selectedMetric)}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Change
            </h3>
            <p className={`text-3xl font-bold ${getMetricInfo().change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {getMetricInfo().change >= 0 ? '+' : ''}{getMetricInfo().change.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h3>
          
          <div className="h-64 flex items-end justify-between space-x-2">
            {getMetricData().map((item, index) => {
              const maxValue = Math.max(...getMetricData().map(d => d.value));
              const height = (item.value / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}></div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {item.label}
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white mt-1">
                    {formatValue(item.value, selectedMetric)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Hotels</h3>
            <div className="space-y-3">
              {[
                { name: "Grand Plaza Hotel", revenue: 125000, occupancy: 85 },
                { name: "Seaside Resort", revenue: 98000, occupancy: 78 },
                { name: "Business Center Hotel", revenue: 87000, occupancy: 72 },
                { name: "Airport Hotel", revenue: 75000, occupancy: 68 },
                { name: "Downtown Inn", revenue: 62000, occupancy: 65 }
              ].map((hotel, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{hotel.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {hotel.occupancy}% occupancy
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${hotel.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Sources</h3>
            <div className="space-y-3">
              {[
                { source: "Direct Website", percentage: 45, color: "bg-blue-500" },
                { source: "Online Travel Agencies", percentage: 30, color: "bg-green-500" },
                { source: "Phone Reservations", percentage: 15, color: "bg-yellow-500" },
                { source: "Walk-ins", percentage: 10, color: "bg-purple-500" }
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.source}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
