import { useEffect, useState } from "react";
import api from "../lib/api";
import { useLoading } from "../contexts/LoadingContext";
import { useAuth } from "../contexts/AuthContext";
import scheduledIcon from "../assets/scheduled.png";
import BookingCard from "../components/BookingCard";
import ErrorToast from "../components/ErrorToast";

export default function Reception() {
  const { showLoading, hideLoading } = useLoading();
  const { user } = useAuth();
  const [bookings, setBookings] = useState({
    history: [],
    active: [],
    future: [],
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [hotelId, setHotelId] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({
    customerID: "",
    roomNumber: "",
    checkInDate: "",
    checkOutDate: "",
    totalAmount: "",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      showLoading();
      // Get receptionist's hotel
      const receptionistResponse = await api.get("/accounts/me");
      const hid = receptionistResponse.data.hotelID;
      if (!hid) {
        throw new Error("No hotel assigned to this receptionist");
      }
      setHotelId(hid);
      // Get bookings for the hotel
      const bookingsResponse = await api.get(`/hotels/${hid}/bookings`);
      const hotelBookings = bookingsResponse.data;
      // Partition bookings
      const history = hotelBookings.filter(
        (b) => b.status === "checked-out" || b.status === "cancelled"
      );
      const active = hotelBookings.filter((b) => b.status === "checked-in");
      const future = hotelBookings.filter((b) => b.status === "booked");
      setBookings({ history, active, future });
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      hideLoading();
    }
  }

  async function createBooking(e) {
    e.preventDefault();
    try {
      if (!hotelId) throw new Error("No hotel");
      showLoading();
      const payload = {
        customerID: form.customerID.trim(),
        roomNumber: form.roomNumber.trim(),
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      };
      await api.post(`/receptionists/hotels/${hotelId}/bookings`, payload);
      setCreateModal(false);
      setForm({ customerID: "", roomNumber: "", checkInDate: "", checkOutDate: "", totalAmount: "" });
      await load();
    } catch (e) {
      setErrorMsg(e.response?.data?.error || e.message);
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-2">
            <img
              src={scheduledIcon}
              alt="Bookings"
              className="h-8 w-8 dark:invert dark:brightness-0 dark:opacity-80"
            />
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Hotel Bookings
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Create Booking
            </button>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Active Bookings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.active.length > 0 ? (
                bookings.active.map((booking) => (
                  <BookingCard key={booking.bookingID} booking={booking} enableStaffActions onUpdated={load} />
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No active bookings
                </p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Bookings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.future.length > 0 ? (
                bookings.future.map((booking) => (
                  <BookingCard key={booking.bookingID} booking={booking} enableStaffActions onUpdated={load} />
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No upcoming bookings
                </p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Past Bookings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.history.length > 0 ? (
                bookings.history.map((booking) => (
                  <BookingCard key={booking.bookingID} booking={booking} enableStaffActions onUpdated={load} />
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No past bookings
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Booking Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Booking</h3>
              <button onClick={() => setCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={createBooking} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Customer ID</label>
                <input value={form.customerID} onChange={(e)=>setForm(p=>({...p,customerID:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Customer UID" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Room Number</label>
                <input value={form.roomNumber} onChange={(e)=>setForm(p=>({...p,roomNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="e.g., 101" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Check-in</label>
                  <input type="date" value={form.checkInDate} onChange={(e)=>setForm(p=>({...p,checkInDate:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
                </div>
                <div>
                  <label className="block text-sm mb-1">Check-out</label>
                  <input type="date" value={form.checkOutDate} onChange={(e)=>setForm(p=>({...p,checkOutDate:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Total Amount (optional)</label>
                <input type="number" min="0" step="1" value={form.totalAmount} onChange={(e)=>setForm(p=>({...p,totalAmount:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Calculated later if empty" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setCreateModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
