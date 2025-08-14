import { useEffect, useState } from "react";
import api from "../lib/api";
import { useLoading } from "../contexts/LoadingContext";
import AdminOverview from "../components/admin/AdminOverview";
import RoomManagement from "../components/admin/RoomManagement";
import GuestManagement from "../components/admin/GuestManagement";
import HotelManagement from "../components/admin/HotelManagement";
import UserManagement from "../components/admin/UserManagement";
import Analytics from "../components/admin/Analytics";
import SystemSettings from "../components/admin/SystemSettings";

export default function Admin() {
  const { showLoading, hideLoading } = useLoading();
  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState(null);
  const [systemStats, setSystemStats] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setErrorMsg("");
    try {
      showLoading();
      const [healthRes, adminStatsRes] = await Promise.all([
        api.get("/health"),
        api.get("/admin/stats"),
      ]);
      setHealth(healthRes.data);
      
      // Use admin stats for better accuracy
      setSystemStats({
        totalHotels: adminStatsRes.data?.totalHotels || 0,
        totalCustomers: adminStatsRes.data?.totalCustomers || 0,
        totalRevenue: adminStatsRes.data?.totalRevenue || 0,
        totalBookings: adminStatsRes.data?.totalBookings || 0,
        recentBookings: adminStatsRes.data?.recentBookings || 0,
        activeBookings: adminStatsRes.data?.activeBookings || 0,
        checkedInGuests: adminStatsRes.data?.checkedInGuests || 0,
        availableRooms: adminStatsRes.data?.availableRooms || 0,
        occupiedRooms: adminStatsRes.data?.occupiedRooms || 0,
        maintenanceRooms: adminStatsRes.data?.maintenanceRooms || 0,
        occupancyRate: adminStatsRes.data?.occupancyRate || 0,
        systemUptime: healthRes.data?.uptime || 0,
        environment: healthRes.data?.environment || "development"
      });
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || e.message);
    } finally {
      hideLoading();
    }
  }

  const tabs = [
    { id: "overview", name: "System Overview", icon: "📊" },
    { id: "hotels", name: "Hotel Management", icon: "🏢" },
    { id: "rooms", name: "Room Management", icon: "🏨" },
    { id: "guests", name: "Guest Management", icon: "👥" },
    { id: "users", name: "User Management", icon: "👤" },
    { id: "analytics", name: "Analytics", icon: "📈" },
    { id: "settings", name: "System Settings", icon: "⚙️" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <AdminOverview health={health} systemStats={systemStats} />;
      case "hotels":
        return <HotelManagement />;
      case "rooms":
        return <RoomManagement />;
      case "guests":
        return <GuestManagement />;
      case "users":
        return <UserManagement />;
      case "analytics":
        return <Analytics />;
      case "settings":
        return <SystemSettings />;
      default:
        return <AdminOverview health={health} systemStats={systemStats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                Hotel Management System - Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Real-time hotel management, guest tracking, and system administration
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-300">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <span className="text-gray-500 dark:text-gray-400">Admin Dashboard</span>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {tabs.find(tab => tab.id === activeTab)?.name}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <nav className="flex flex-wrap gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md transform scale-105"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats Overview */}
        {activeTab === "overview" && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold">${systemStats.totalRevenue?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Active Bookings</p>
                    <p className="text-2xl font-bold">{systemStats.activeBookings || '0'}</p>
                  </div>
                  <div className="text-3xl">📅</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Occupancy Rate</p>
                    <p className="text-2xl font-bold">{systemStats.occupancyRate || '0'}%</p>
                  </div>
                  <div className="text-3xl">🏨</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Checked-in Guests</p>
                    <p className="text-2xl font-bold">{systemStats.checkedInGuests || '0'}</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}


