import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';
import ErrorToast from '../ErrorToast';

export default function GuestManagement() {
  const { showLoading, hideLoading } = useLoading();
  const [bookings, setBookings] = useState([]);
  const [guestHistory, setGuestHistory] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('current');
  const [viewModal, setViewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    hotelID: '',
    customerID: '',
    roomIdInput: '',
    checkInDate: '',
    checkOutDate: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [riskMap, setRiskMap] = useState({}); // bookingID -> { label, riskScore }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      showLoading();
      const [bookingsRes, hotelsRes] = await Promise.all([
        api.get('/admin/bookings'),
        api.get('/hotels')
      ]);
      setBookings(bookingsRes.data || []);
      // history is a subset where status is checked-in/checked-out
      setGuestHistory((bookingsRes.data || []).filter(b => ['checked-in','checked-out','cancelled'].includes(b.status)));
      setHotels(hotelsRes.data || []);
    } catch (error) {
      console.error('Error loading guest data:', error);
    } finally {
      hideLoading();
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const hotelMatch = selectedHotel === 'all' || booking.hotelID === selectedHotel;
    const statusMatch = filterStatus === 'all' || booking.status === filterStatus;
    return hotelMatch && statusMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'booked': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'checked-in': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'checked-out': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return '📋';
      case 'booked': return '⏳';
      case 'checked-in': return '✅';
      case 'checked-out': return '🏁';
      case 'cancelled': return '❌';
      default: return '⏳';
    }
  };

  const riskBadgeClass = (label) => {
    switch (label) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const fetchRisk = async (bookingId, { silent = false } = {}) => {
    try {
      if (!silent) showLoading();
      const resp = await api.post(`/ai/cancel-risk/${bookingId}`);
      setRiskMap((m)=>({ ...m, [bookingId]: resp.data }));
    } catch (e) {
      console.error('AI risk failed', e);
    } finally {
      if (!silent) hideLoading();
    }
  };

  // Auto-fetch risk for a small batch of booked/confirmed rows when bookings change
  useEffect(() => {
    if (!Array.isArray(bookings) || bookings.length === 0) return;
    const candidates = bookings.filter(b => (b.status === 'booked' || b.status === 'confirmed') && !riskMap[b.bookingID]).slice(0, 8);
    if (candidates.length === 0) return;
    (async () => {
      await Promise.allSettled(candidates.map(b => fetchRisk(b.bookingID, { silent: true })));
    })();
  }, [bookings]);

  const getHotelName = (hotelID) => {
    const hotel = hotels.find(h => h.hotelID === hotelID);
    return hotel ? hotel.name : 'Unknown Hotel';
  };

  const toJsDate = (value) => {
    if (!value) return null;
    // Firestore Timestamp compatibility
    if (typeof value === 'object' && value !== null) {
      if (typeof value.toDate === 'function') return value.toDate();
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (date) => {
    const js = toJsDate(date);
    return js ? js.toLocaleDateString() : 'N/A';
  };

  const formatDateTime = (date) => {
    const js = toJsDate(date);
    return js ? js.toLocaleString() : 'N/A';
  };

  const getDuration = (checkIn, checkOut) => {
    const start = toJsDate(checkIn);
    const end = toJsDate(checkOut);
    if (!start || !end) return 'N/A';
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const handleStatusUpdate = async (booking, newStatus) => {
    try {
      showLoading();
      const hotelId = booking.hotelID;
      const bookingId = booking.bookingID;
      if (newStatus === 'checked-in') {
        await api.post(`/hotels/${hotelId}/bookings/${bookingId}/checkin`);
      } else if (newStatus === 'checked-out') {
        await api.post(`/hotels/${hotelId}/bookings/${bookingId}/checkout`);
      } else if (newStatus === 'cancelled') {
        await api.post(`/hotels/${hotelId}/bookings/${bookingId}/cancel`);
      }
      await loadData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      const msg = error?.response?.data?.error || error.message || 'Action failed';
      setErrorMsg(msg);
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="p-6">
      <ErrorToast message={errorMsg} onClose={()=>setErrorMsg('')} />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Guest Management
      </h2>

      {/* Filters & Create */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="checked-out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
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

          <div className="flex items-end">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2 text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total: {filteredBookings.length}
              </span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setCreateModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
            >
              + Create Booking
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">👥</span>
            Current Guests
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span className="mr-2">📚</span>
            Guest History
          </button>
        </nav>
      </div>

      {/* Current Guests Tab */}
      {activeTab === 'current' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hotel & Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Check-in/out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.customerName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {booking.customerEmail}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {booking.customerPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getHotelName(booking.hotelID)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          Room {booking.roomNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div>In: {formatDate(booking.checkInDate)}</div>
                        <div>Out: {formatDate(booking.checkOutDate)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getDuration(booking.checkInDate, booking.checkOutDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${booking.totalAmount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {riskMap[booking.bookingID] ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskBadgeClass(riskMap[booking.bookingID].label)}`} title={`Risk ${riskMap[booking.bookingID].riskScore}%`}>
                          {riskMap[booking.bookingID].label} {riskMap[booking.bookingID].riskScore}%
                        </span>
                      ) : (
                        <button onClick={()=>fetchRisk(booking.bookingID)} className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs">Get Risk</button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getStatusIcon(booking.status)}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(booking.status === 'confirmed' || booking.status === 'booked') && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(booking, 'checked-in')}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(booking, 'cancelled')}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'checked-in' && (
                          <button
                            onClick={() => handleStatusUpdate(booking, 'checked-out')}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Check Out
                          </button>
                        )}
                        <button onClick={() => { setSelectedBooking(booking); setViewModal(true); }} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guest History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hotel & Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stay Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {guestHistory.map((booking) => (
                  <tr key={booking.bookingID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.customerName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {booking.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getHotelName(booking.hotelID)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          Room {booking.roomNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div>In: {formatDate(booking.checkInDate)}</div>
                        <div>Out: {formatDate(booking.checkOutDate)}</div>
                        <div className="text-xs text-gray-500">
                          {getDuration(booking.checkInDate, booking.checkOutDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${booking.totalAmount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getStatusIcon(booking.status)}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDateTime(booking.updatedAt || booking.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Booking Modal */}
      {viewModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Booking Details</h3>
              <button onClick={()=>setViewModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-600 dark:text-gray-300">Hotel:</span> <span className="font-medium">{getHotelName(selectedBooking.hotelID)}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Check-in:</span> <span className="font-medium">{formatDate(selectedBooking.checkInDate)}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Check-out:</span> <span className="font-medium">{formatDate(selectedBooking.checkOutDate)}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Amount:</span> <span className="font-medium">${selectedBooking.totalAmount || 0}</span></div>
              <div><span className="text-gray-600 dark:text-gray-300">Status:</span> <span className="font-medium">{selectedBooking.status}</span></div>
            </div>
            <div className="mt-6 text-right"><button onClick={()=>setViewModal(false)} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button></div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Booking</h3><button onClick={()=>setCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
            <form onSubmit={async (e)=>{ e.preventDefault(); try { showLoading(); const payload = { hotelId: createForm.hotelID, customerID: createForm.customerID, roomDetails: [createForm.roomIdInput], checkInDate: createForm.checkInDate, checkOutDate: createForm.checkOutDate }; await api.post('/bookings', payload); setCreateModal(false); await loadData(); } catch (err) { console.error('Create booking failed', err); } finally { hideLoading(); } }} className="space-y-4">
              <div><label className="block text-sm mb-1">Hotel</label><select value={createForm.hotelID} onChange={e=>setCreateForm(p=>({...p,hotelID:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required><option value="">Select hotel</option>{hotels.map(h=> <option key={h.hotelID} value={h.hotelID}>{h.name}</option>)}</select></div>
              <div><label className="block text-sm mb-1">Customer ID</label><input value={createForm.customerID} onChange={e=>setCreateForm(p=>({...p,customerID:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Customer UID" required /></div>
              <div><label className="block text-sm mb-1">Room ID</label><input value={createForm.roomIdInput} onChange={e=>setCreateForm(p=>({...p,roomIdInput:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Room document ID" required /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Check-in</label><input type="date" value={createForm.checkInDate} onChange={e=>setCreateForm(p=>({...p,checkInDate:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Check-out</label><input type="date" value={createForm.checkOutDate} onChange={e=>setCreateForm(p=>({...p,checkOutDate:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
              </div>
              <div className="flex justify-end space-x-2"><button type="button" onClick={()=>setCreateModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
