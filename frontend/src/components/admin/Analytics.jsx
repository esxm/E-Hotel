import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function Analytics() {
  const { showLoading, hideLoading } = useLoading();
  const [series, setSeries] = useState({ revenue: [], occupancy: [], bookings: [], range: 'monthly' });
  const [timeRange, setTimeRange] = useState('monthly');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  async function loadAnalyticsData() {
    try {
      showLoading();
      const { data } = await api.get(`/admin/analytics/timeseries`, { params: { range: timeRange } });
      setSeries({ revenue: data.revenue || [], occupancy: data.occupancy || [], bookings: data.bookings || [], range: data.range || timeRange });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      hideLoading();
    }
  }

  const getMetricData = () => {
    return series[selectedMetric] || [];
  };

  const getMetricInfo = () => {
    const data = getMetricData();
    if (data.length === 0) return { total: 0, change: 0, avg: 0 };
    const total = data.reduce((sum, item) => sum + (Number(item.value)||0), 0);
    const avg = total / data.length;
    const change = data.length > 1 ? ((data[data.length-1].value - data[data.length-2].value) / (data[data.length-2].value||1)) * 100 : 0;
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

  const Chart = useMemo(() => {
    const data = getMetricData();
    if (data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => Number(d.value)||0)) || 1;
    const minVal = 0;
    const width = 900;
    const height = 280;
    const pad = 40;
    const toX = (i) => pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1);
    const toY = (v) => height - pad - ((v - minVal) / (maxVal - minVal)) * (height - pad * 2);
    const path = data.map((d,i)=> `${i===0?'M':'L'} ${toX(i)} ${toY(d.value)}`).join(' ');
    const grid = Array.from({length:5}).map((_,i)=>{
      const y = pad + i*((height-pad*2)/4);
      return <line key={i} x1={pad} y1={y} x2={width-pad} y2={y} stroke="#e5e7eb" opacity="0.7" strokeWidth="1" />
    });
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {grid}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" />
        {data.map((d,i)=> (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3" fill="#1d4ed8" />
        ))}
        {data.map((d,i)=> (
          <text key={`lbl-${i}`} x={toX(i)} y={height - pad/2} textAnchor="middle" fontSize="10" fill="#6b7280">{d.label}</text>
        ))}
      </svg>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, selectedMetric]);

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
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h3>
          {Chart}
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
