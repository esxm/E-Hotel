import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function RoomManagement() {
  const { showLoading, hideLoading } = useLoading();
  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    issue: '',
    priority: 'medium',
    description: ''
  });
  const [editRoomModal, setEditRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    type: 'standard',
    pricePerNight: 0,
    floor: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      showLoading();
      const [roomsRes, hotelsRes] = await Promise.all([
        api.get('/admin/rooms/status'),
        api.get('/hotels')
      ]);
      setRooms(roomsRes.data || []);
      setHotels(hotelsRes.data || []);
    } catch (error) {
      console.error('Error loading room data:', error);
    } finally {
      hideLoading();
    }
  }

  const filteredRooms = rooms.filter(room => {
    const hotelMatch = selectedHotel === 'all' || room.hotelID === selectedHotel;
    const statusMatch = filterStatus === 'all' || room.status === filterStatus;
    return hotelMatch && statusMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'occupied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'reserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return '🟢';
      case 'occupied': return '🔴';
      case 'maintenance': return '🟡';
      case 'reserved': return '🔵';
      default: return '⚪';
    }
  };

  const openMaintenanceModal = (room) => {
    setSelectedRoom(room);
    setMaintenanceModal(true);
  };

  const openEditRoom = (room) => {
    setSelectedRoom(room);
    setRoomForm({ type: room.type || room.roomType || 'standard', pricePerNight: room.pricePerNight || room.price || 0, floor: room.floor || '' });
    setEditRoomModal(true);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      showLoading();
      await api.post('/admin/maintenance', {
        roomID: selectedRoom.roomID,
        hotelID: selectedRoom.hotelID,
        ...maintenanceForm
      });
      setMaintenanceModal(false);
      setMaintenanceForm({ issue: '', priority: 'medium', description: '' });
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error creating maintenance request:', error);
    } finally {
      hideLoading();
    }
  };

  const getHotelName = (hotelID) => {
    const hotel = hotels.find(h => h.hotelID === hotelID);
    return hotel ? hotel.name : 'Unknown Hotel';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Real-Time Room Management
      </h2>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Hotel
            </label>
            <select
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Hotels</option>
              {hotels.map(hotel => (
                <option key={hotel.hotelID} value={hotel.hotelID}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
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

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map(room => (
          <div
            key={room.roomID}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${
              room.status === 'available' ? 'border-green-200 dark:border-green-800' :
              room.status === 'occupied' ? 'border-red-200 dark:border-red-800' :
              room.status === 'maintenance' ? 'border-yellow-200 dark:border-yellow-800' :
              'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="p-6">
              {/* Room Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Room {room.roomNumber}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getHotelName(room.hotelID)}
                  </p>
                </div>
                <div className={`text-2xl ${getStatusIcon(room.status)}`}></div>
              </div>

              {/* Room Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Type:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {room.roomType || 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Price:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${room.price || 0}/night
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Floor:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {room.floor || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
              </div>

              {/* Guest Information */}
              {room.currentGuest && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Current Guest
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {room.currentGuest.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Check-in:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(room.currentGuest.checkInDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Check-out:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(room.currentGuest.checkOutDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {room.currentGuest.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                {room.status === 'available' && (
                  <button
                    onClick={() => openMaintenanceModal(room)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium py-2 px-3 rounded-md"
                  >
                    🛠️ Maintenance
                  </button>
                )}
                {room.status === 'maintenance' && (
                  <button
                    onClick={() => openMaintenanceModal(room)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md"
                  >
                    📋 View Details
                  </button>
                )}
                <button
                  onClick={() => openEditRoom(room)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium py-2 px-3 rounded-md"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Modal */}
      {maintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Maintenance Request
              </h3>
              <button
                onClick={() => setMaintenanceModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Room: {selectedRoom?.roomNumber} - {getHotelName(selectedRoom?.hotelID)}
              </p>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issue Type
                </label>
                <select
                  value={maintenanceForm.issue}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, issue: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Issue</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="furniture">Furniture</option>
                  <option value="appliances">Appliances</option>
                  <option value="cleaning">Deep Cleaning</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={maintenanceForm.priority}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceModal(false)}
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editRoomModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Room {selectedRoom.roomNumber}</h3>
              <button onClick={() => setEditRoomModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              try {
                showLoading();
                await api.patch(`/hotels/${selectedRoom.hotelID}/rooms/${selectedRoom.roomID}`, {
                  type: roomForm.type,
                  pricePerNight: Number(roomForm.pricePerNight),
                  floor: roomForm.floor || null,
                });
                setEditRoomModal(false);
                await loadData();
              } catch (err) {
                console.error('Error updating room', err);
              } finally { hideLoading(); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Type</label>
                <select value={roomForm.type} onChange={e=>setRoomForm(p=>({...p,type:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
                  <option value="standard">Standard</option>
                  <option value="double">Double</option>
                  <option value="suite">Suite</option>
                  <option value="presidential">Presidential Suite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Price per Night ($)</label>
                <input type="number" min="0" value={roomForm.pricePerNight} onChange={e=>setRoomForm(p=>({...p,pricePerNight:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Floor</label>
                <input value={roomForm.floor} onChange={e=>setRoomForm(p=>({...p,floor:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={()=>setEditRoomModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
