import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function HotelManagement() {
  const { showLoading, hideLoading } = useLoading();
  const [hotels, setHotels] = useState([]);
  const [managers, setManagers] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [activeTab, setActiveTab] = useState('hotels');
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [detailsModalHotel, setDetailsModalHotel] = useState(null);
  const [analyticsModalHotel, setAnalyticsModalHotel] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState({ year: new Date().getFullYear().toString(), month: String(new Date().getMonth()+1).padStart(2,'0') });
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    starRating: 3,
    totalRooms: 50,
    description: '',
    phone: '',
    email: '',
    amenities: [],
    checkInTime: '15:00',
    checkOutTime: '11:00'
  });

  // live analytics per hotel
  const [hotelAnalytics, setHotelAnalytics] = useState({}); // { [hotelID]: analytics }

  // Manager create/edit state
  const [managerCreateModal, setManagerCreateModal] = useState(false);
  const [managerEditModal, setManagerEditModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerForm, setManagerForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    assignedHotelId: ''
  });

  // Receptionist create/edit state
  const [receptionistCreateModal, setReceptionistCreateModal] = useState(false);
  const [receptionistEditModal, setReceptionistEditModal] = useState(false);
  const [selectedReceptionist, setSelectedReceptionist] = useState(null);
  const [receptionistForm, setReceptionistForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    hotelId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      showLoading();
      const [hotelsRes, managersRes, receptionistsRes] = await Promise.all([
        api.get('/hotels'),
        api.get('/admin/managers'),
        api.get('/admin/receptionists')
      ]);
      setHotels(hotelsRes.data || []);
      setManagers(managersRes.data || []);
      setReceptionists(receptionistsRes.data || []);
      // fetch analytics per hotel in parallel
      const analyticsPairs = await Promise.all(
        (hotelsRes.data || []).map(async (h) => {
          try {
            const { data } = await api.get(`/admin/hotels/${h.hotelID}/analytics`);
            return [h.hotelID, data];
          } catch (e) {
            console.error('analytics fetch failed for', h.hotelID, e);
            return [h.hotelID, null];
          }
        })
      );
      const map = {};
      analyticsPairs.forEach(([k,v]) => { map[k] = v; });
      setHotelAnalytics(map);
    } catch (error) {
      console.error('Error loading hotel data:', error);
    } finally {
      hideLoading();
    }
  }

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      await api.post('/hotels', hotelForm);
      setCreateModal(false);
      setHotelForm({
        name: '', address: '', starRating: 3, totalRooms: 50,
        description: '', phone: '', email: '', amenities: [],
        checkInTime: '15:00', checkOutTime: '11:00'
      });
      await loadData();
    } catch (error) {
      console.error('Error creating hotel:', error);
    } finally {
      hideLoading();
    }
  };

  const handleEditHotel = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      await api.patch(`/hotels/${selectedHotel.hotelID}`, hotelForm);
      setEditModal(false);
      setSelectedHotel(null);
      await loadData();
    } catch (error) {
      console.error('Error updating hotel:', error);
    } finally {
      hideLoading();
    }
  };

  const openEditModal = (hotel) => {
    setSelectedHotel(hotel);
    setHotelForm({
      name: hotel.name || '',
      address: hotel.address || '',
      starRating: hotel.starRating || 3,
      totalRooms: hotel.totalRooms || 50,
      description: hotel.description || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
      amenities: hotel.amenities || [],
      checkInTime: hotel.checkInTime || '15:00',
      checkOutTime: hotel.checkOutTime || '11:00'
    });
    setEditModal(true);
  };

  const getHotelStats = (hotelId) => {
    const a = hotelAnalytics[hotelId];
    return {
      totalBookings: a?.totalBookings || 0,
      totalRevenue: a?.totalRevenue || 0,
      occupancyRate: a?.occupancyRate || 0,
      activeBookings: a?.activeBookings || 0,
      availableRooms: a?.availableRooms || 0,
      occupiedRooms: a?.occupiedRooms || 0,
      maintenanceRooms: a?.maintenanceRooms || 0,
    };
  };

  const getManagerForHotel = (hotel) => {
    if (!hotel?.managerId) return null;
    return managers.find((m) => m.managerID === hotel.managerId) || null;
  };

  const getReceptionistsForHotel = (hotel) => {
    const ids = hotel?.receptionistIds || [];
    return receptionists.filter((r) => ids.includes(r.receptionistID));
  };

  const assignManager = async (hotelId, managerId) => {
    try {
      showLoading();
      await api.post(`/admin/hotels/${hotelId}/assign-manager`, { managerId });
      await loadData();
    } catch (error) {
      console.error('Error assigning manager:', error);
    } finally {
      hideLoading();
    }
  };

  const updateReceptionistAssignment = async (hotelId, receptionistId, action) => {
    try {
      showLoading();
      await api.post(`/admin/hotels/${hotelId}/receptionists`, { receptionistId, action });
      await loadData();
    } catch (error) {
      console.error('Error updating receptionist assignment:', error);
    } finally {
      hideLoading();
    }
  };

  const submitCreateManager = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      const payload = { name: managerForm.name, email: managerForm.email, phoneNumber: managerForm.phoneNumber };
      if (managerForm.password) payload.password = managerForm.password;
      const res = await api.post('/admin/managers', payload);
      if (managerForm.assignedHotelId) {
        await api.post(`/admin/hotels/${managerForm.assignedHotelId}/assign-manager`, { managerId: res.data.managerID });
      }
      setManagerCreateModal(false);
      await loadData();
    } catch (error) {
      console.error('Error creating manager:', error);
    } finally {
      hideLoading();
    }
  };

  const submitEditManager = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      await api.patch(`/admin/managers/${selectedManager.managerID}`, {
        name: managerForm.name,
        phoneNumber: managerForm.phoneNumber,
      });
      // reassign if changed
      const currentHotelId = (hotels.find(h => h.managerId === selectedManager.managerID)?.hotelID) || '';
      if (managerForm.assignedHotelId !== currentHotelId) {
        if (currentHotelId) await api.post(`/admin/hotels/${currentHotelId}/assign-manager`, { managerId: null });
        if (managerForm.assignedHotelId) await api.post(`/admin/hotels/${managerForm.assignedHotelId}/assign-manager`, { managerId: selectedManager.managerID });
      }
      setManagerEditModal(false);
      setSelectedManager(null);
      await loadData();
    } catch (error) {
      console.error('Error updating manager:', error);
    } finally {
      hideLoading();
    }
  };

  const submitCreateReceptionist = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      const payload = { name: receptionistForm.name, email: receptionistForm.email, phoneNumber: receptionistForm.phoneNumber };
      if (receptionistForm.password) payload.password = receptionistForm.password;
      if (receptionistForm.hotelId) payload.hotelId = receptionistForm.hotelId;
      await api.post('/admin/receptionists', payload);
      setReceptionistCreateModal(false);
      await loadData();
    } catch (error) {
      console.error('Error creating receptionist:', error);
    } finally {
      hideLoading();
    }
  };

  const submitEditReceptionist = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      await api.patch(`/admin/receptionists/${selectedReceptionist.receptionistID}`, {
        name: receptionistForm.name,
        phoneNumber: receptionistForm.phoneNumber,
      });
      await api.post(`/admin/receptionists/${selectedReceptionist.receptionistID}/assign`, { hotelId: receptionistForm.hotelId || null });
      setReceptionistEditModal(false);
      setSelectedReceptionist(null);
      await loadData();
    } catch (error) {
      console.error('Error updating receptionist:', error);
    } finally {
      hideLoading();
    }
  };

  const amenities = [
    'WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Room Service',
    'Laundry', 'Business Center', 'Conference Rooms', 'Shuttle Service'
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hotel Management
        </h2>
        <button
          onClick={() => setCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Add Hotel
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'hotels'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">🏨</span>
            Hotels
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
            Managers
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
            Receptionists
          </button>
        </nav>
      </div>

      {/* Hotels Tab */}
      {activeTab === 'hotels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {hotels.map(hotel => {
            const stats = getHotelStats(hotel.hotelID);
            const manager = getManagerForHotel(hotel);
            const hotelReceptionists = getReceptionistsForHotel(hotel);
            
            return (
              <div key={hotel.hotelID} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  {/* Hotel Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {hotel.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {hotel.address}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-500 text-lg mr-1">⭐</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {hotel.starRating}
                      </span>
                    </div>
                  </div>

                  {/* Hotel Stats (live) */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.totalBookings}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${stats.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.occupancyRate}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Occupancy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {stats.activeBookings}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Active bookings</p>
                    </div>
                  </div>

                  {/* Hotel Details */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Rooms:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {hotel.totalRooms}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Manager:</span>
                      <div className="flex items-center space-x-2">
                        <select
                          value={manager?.managerID || ''}
                          onChange={(e) => assignManager(hotel.hotelID, e.target.value || null)}
                          className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white"
                        >
                          <option value="">Unassigned</option>
                          {managers.map(m => (
                            <option key={m.managerID} value={m.managerID}>{m.name}</option>
                          ))}
                        </select>
                    </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Receptionists</span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              updateReceptionistAssignment(hotel.hotelID, e.target.value, 'add');
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white"
                        >
                          <option value="">Add receptionist…</option>
                          {receptionists.filter(r => !hotelReceptionists.some(hr => hr.receptionistID === r.receptionistID)).map(r => (
                            <option key={r.receptionistID} value={r.receptionistID}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hotelReceptionists.map(r => (
                          <span key={r.receptionistID} className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">
                            {r.name}
                            <button
                              onClick={() => updateReceptionistAssignment(hotel.hotelID, r.receptionistID, 'remove')}
                              className="ml-1 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                      </span>
                        ))}
                        {hotelReceptionists.length === 0 && (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">No receptionists assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(hotel)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this hotel?')) {
                          try {
                            showLoading();
                            await api.delete(`/hotels/${hotel.hotelID}`);
                            await loadData();
                          } catch (e) {
                            console.error('Error deleting hotel', e);
                          } finally {
                            hideLoading();
                          }
                        }
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded-md"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDetailsModalHotel(hotel)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-md">
                      View Details
                    </button>
                    <button
                      onClick={() => setAnalyticsModalHotel(hotel)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-md">
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Hotel Details Modal */}
      {detailsModalHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hotel Details – {detailsModalHotel.name}</h3>
              <button onClick={() => setDetailsModalHotel(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-600 dark:text-gray-300">Address:</span> <span className="font-medium">{detailsModalHotel.address}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Stars:</span> <span className="font-medium">{detailsModalHotel.starRating}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Rooms:</span> <span className="font-medium">{detailsModalHotel.totalRooms}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Phone:</span> <span className="font-medium">{detailsModalHotel.phone || '-'}</span></div>
              <div className="md:col-span-2"><span className="text-gray-600 dark:text-gray-300">Description:</span> <span className="font-medium">{detailsModalHotel.description || '-'}</span></div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setDetailsModalHotel(null)} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Analytics Modal */}
      {analyticsModalHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics – {analyticsModalHotel.name}</h3>
              <button onClick={() => setAnalyticsModalHotel(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <select value={analyticsPeriod.year} onChange={e=>setAnalyticsPeriod(p=>({...p,year:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gray-800">
                {Array.from({length:5}).map((_,i)=>{
                  const y = (new Date().getFullYear()-i).toString();
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
              <select value={analyticsPeriod.month} onChange={e=>setAnalyticsPeriod(p=>({...p,month:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gray-800">
                {Array.from({length:12}).map((_,i)=>{
                  const m = String(i+1).padStart(2,'0');
                  return <option key={m} value={m}>{m}</option>
                })}
              </select>
              <button
                onClick={async ()=>{
                  try {
                    showLoading();
                    const { data } = await api.get(`/admin/hotels/${analyticsModalHotel.hotelID}/analytics`, { params: { year: analyticsPeriod.year, month: analyticsPeriod.month } });
                    setHotelAnalytics(prev=>({ ...prev, [analyticsModalHotel.hotelID]: data }));
                  } catch (e) {
                    console.error('refresh analytics failed', e);
                  } finally { hideLoading(); }
                }}
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
              >Refresh</button>
            </div>
            {(() => { const a = hotelAnalytics[analyticsModalHotel.hotelID] || {}; return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Total Bookings</div><div className="text-2xl font-bold">{a.totalBookings || 0}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Total Revenue</div><div className="text-2xl font-bold">${(a.totalRevenue||0).toLocaleString()}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Active Bookings</div><div className="text-2xl font-bold">{a.activeBookings || 0}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Available Rooms</div><div className="text-2xl font-bold">{a.availableRooms || 0}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Occupied Rooms</div><div className="text-2xl font-bold">{a.occupiedRooms || 0}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800"><div className="text-xs text-gray-500">Maintenance Rooms</div><div className="text-2xl font-bold">{a.maintenanceRooms || 0}</div></div>
                <div className="p-4 rounded bg-gray-100 dark:bg-gray-800 md:col-span-3"><div className="text-xs text-gray-500">Occupancy Rate</div><div className="text-2xl font-bold">{a.occupancyRate || 0}%</div></div>
              </div>
            )})()}
            <div className="mt-6 text-right">
              <button onClick={() => setAnalyticsModalHotel(null)} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manager Modal */}
      {managerCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Manager</h3>
              <button onClick={() => setManagerCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={submitCreateManager} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={managerForm.name} onChange={e=>setManagerForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={managerForm.email} onChange={e=>setManagerForm(p=>({...p,email:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input value={managerForm.phoneNumber} onChange={e=>setManagerForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Password</label>
                  <input type="password" value={managerForm.password} onChange={e=>setManagerForm(p=>({...p,password:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Assign to Hotel (optional)</label>
                <select value={managerForm.assignedHotelId} onChange={e=>setManagerForm(p=>({...p,assignedHotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
                  <option value="">Unassigned</option>
                  {hotels.map(h=> <option key={h.hotelID} value={h.hotelID}>{h.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={()=>setManagerCreateModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {managerEditModal && selectedManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Manager</h3>
              <button onClick={() => setManagerEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={submitEditManager} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={managerForm.name} onChange={e=>setManagerForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={managerForm.email} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input value={managerForm.phoneNumber} onChange={e=>setManagerForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Assign to Hotel</label>
                  <select value={managerForm.assignedHotelId} onChange={e=>setManagerForm(p=>({...p,assignedHotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
                    <option value="">Unassigned</option>
                    {hotels.map(h=> <option key={h.hotelID} value={h.hotelID}>{h.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={()=>setManagerEditModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Receptionist Modal */}
      {receptionistCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Receptionist</h3>
              <button onClick={() => setReceptionistCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={submitCreateReceptionist} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={receptionistForm.name} onChange={e=>setReceptionistForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={receptionistForm.email} onChange={e=>setReceptionistForm(p=>({...p,email:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input value={receptionistForm.phoneNumber} onChange={e=>setReceptionistForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Password</label>
                  <input type="password" value={receptionistForm.password} onChange={e=>setReceptionistForm(p=>({...p,password:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Assign to Hotel (optional)</label>
                <select value={receptionistForm.hotelId} onChange={e=>setReceptionistForm(p=>({...p,hotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
                  <option value="">Unassigned</option>
                  {hotels.map(h=> <option key={h.hotelID} value={h.hotelID}>{h.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={()=>setReceptionistCreateModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Receptionist Modal */}
      {receptionistEditModal && selectedReceptionist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Receptionist</h3>
              <button onClick={() => setReceptionistEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={submitEditReceptionist} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={receptionistForm.name} onChange={e=>setReceptionistForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={receptionistForm.email} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input value={receptionistForm.phoneNumber} onChange={e=>setReceptionistForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Assigned Hotel</label>
                  <select value={receptionistForm.hotelId} onChange={e=>setReceptionistForm(p=>({...p,hotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
                    <option value="">Unassigned</option>
                    {hotels.map(h=> <option key={h.hotelID} value={h.hotelID}>{h.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={()=>setReceptionistEditModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Managers Tab */}
      {activeTab === 'managers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setManagerForm({ name: '', email: '', phoneNumber: '', password: '', assignedHotelId: '' });
                setManagerCreateModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              + Add Manager
            </button>
          </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned Hotel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {managers.map((manager) => {
                    const assigned = hotels.find(h => h.managerId === manager.managerID);
                  return (
                    <tr key={manager.managerID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{manager.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{manager.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={assigned?.hotelID || ''}
                            onChange={async (e) => {
                              await assignManager(e.target.value || assigned?.hotelID, manager.managerID);
                            }}
                            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white"
                          >
                            <option value="">Unassigned</option>
                            {hotels.map(h => (
                              <option key={h.hotelID} value={h.hotelID}>{h.name}</option>
                            ))}
                          </select>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">{manager.phoneNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                            onClick={() => {
                              setSelectedManager(manager);
                              setManagerForm({
                                name: manager.name || '',
                                email: manager.email || '',
                                phoneNumber: manager.phoneNumber || '',
                                password: '',
                                assignedHotelId: (hotels.find(h => h.managerId === manager.managerID)?.hotelID) || ''
                              });
                              setManagerEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete manager?')) {
                                try {
                                  showLoading();
                                  await api.delete(`/admin/managers/${manager.managerID}`);
                                  await loadData();
                                } catch (e) {
                                  console.error('Error deleting manager', e);
                                } finally {
                                  hideLoading();
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Receptionists Tab */}
      {activeTab === 'receptionists' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setReceptionistForm({ name: '', email: '', phoneNumber: '', password: '', hotelId: '' });
                setReceptionistCreateModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              + Add Receptionist
            </button>
          </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Receptionist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned Hotel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {receptionists.map((r) => {
                    const assignedHotel = hotels.find(h => (h.receptionistIds || []).includes(r.receptionistID));
                  return (
                      <tr key={r.receptionistID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{r.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={assignedHotel?.hotelID || ''}
                            onChange={async (e) => {
                              try {
                                showLoading();
                                await api.post(`/admin/receptionists/${r.receptionistID}/assign`, { hotelId: e.target.value || null });
                                await loadData();
                              } catch (err) {
                                console.error('Error assigning receptionist', err);
                              } finally {
                                hideLoading();
                              }
                            }}
                            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white"
                          >
                            <option value="">Unassigned</option>
                            {hotels.map(h => (
                              <option key={h.hotelID} value={h.hotelID}>{h.name}</option>
                            ))}
                          </select>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">{r.phoneNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                            onClick={() => {
                              setSelectedReceptionist(r);
                              setReceptionistForm({
                                name: r.name || '',
                                email: r.email || '',
                                phoneNumber: r.phoneNumber || '',
                                password: '',
                                hotelId: (hotels.find(h => (h.receptionistIds || []).includes(r.receptionistID))?.hotelID) || ''
                              });
                              setReceptionistEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete receptionist?')) {
                                try {
                                  showLoading();
                                  await api.delete(`/admin/receptionists/${r.receptionistID}`);
                                  await loadData();
                                } catch (e) {
                                  console.error('Error deleting receptionist', e);
                                } finally {
                                  hideLoading();
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Hotel Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Hotel
              </h3>
              <button
                onClick={() => setCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHotel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hotel Name
                  </label>
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Star Rating
                  </label>
                  <select
                    value={hotelForm.starRating}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, starRating: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Rooms
                  </label>
                  <input
                    type="number"
                    value={hotelForm.totalRooms}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, totalRooms: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={hotelForm.email}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={hotelForm.phone}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkInTime}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkOutTime}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={hotelForm.description}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amenities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {amenities.map(amenity => (
                    <label key={amenity} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hotelForm.amenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHotelForm(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
                          } else {
                            setHotelForm(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Create Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hotel Modal */}
      {editModal && selectedHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Hotel: {selectedHotel.name}
              </h3>
              <button
                onClick={() => setEditModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditHotel} className="space-y-4">
              {/* Same form fields as create modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hotel Name
                  </label>
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Star Rating
                  </label>
                  <select
                    value={hotelForm.starRating}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, starRating: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Rooms
                  </label>
                  <input
                    type="number"
                    value={hotelForm.totalRooms}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, totalRooms: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={hotelForm.email}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={hotelForm.phone}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkInTime}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkOutTime}
                    onChange={(e) => setHotelForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={hotelForm.description}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amenities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {amenities.map(amenity => (
                    <label key={amenity} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hotelForm.amenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHotelForm(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
                          } else {
                            setHotelForm(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
