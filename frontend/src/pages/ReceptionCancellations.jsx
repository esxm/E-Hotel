import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useLoading } from "../contexts/LoadingContext";
import ErrorToast from "../components/ErrorToast";

export default function ReceptionCancellations() {
  const { showLoading, hideLoading } = useLoading();
  const [errorMsg, setErrorMsg] = useState("");
  const [hotelId, setHotelId] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      showLoading();
      const me = await api.get("/accounts/me");
      const hid = me.data.hotelID;
      if (!hid) throw new Error("No hotel assigned to this receptionist");
      setHotelId(hid);

      // Get all cancelled bookings for this hotel and any penalties due
      const resp = await api.get(`/hotels/${hid}/bookings`);
      const all = resp.data || [];
      const cancelled = all.filter((b) => b.status === "cancelled");
      // Build items for UI. We show both penalty due and paid states.
      const rows = cancelled.map((b) => ({
        bookingID: b.bookingID,
        customerID: b.customerID,
        customerName: b.customerDetails?.name || "",
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: b.totalAmount,
        paymentStatus: b.paymentStatus,
      }));
      setItems(rows);
    } catch (e) {
      setErrorMsg(e.response?.data?.error || e.message);
    } finally {
      hideLoading();
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "due") return items.filter((i) => i.paymentStatus !== "Paid Penalties" && i.paymentStatus !== "no penalties");
    if (filter === "paid") return items.filter((i) => i.paymentStatus === "Paid Penalties");
    return items;
  }, [items, filter]);

  async function handlePayPenalty(row) {
    try {
      if (!hotelId) return;
      showLoading();
      await api.post(`/service-bookings/noop`); // placeholder to keep consistent interceptor timing
    } catch {}
    try {
      await api.post(`/bookings/${row.bookingID}/cancel`); // no-op to keep compatibility if backend expects role mapping
    } catch {}
    try {
      // Hit dedicated pay penalty endpoint
      await api.post(`/hotels/${hotelId}/bookings/${row.bookingID}/pay-penalty`, {
        customerID: row.customerID,
      });
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cancellation Requests</h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="due">Penalties Due</option>
              <option value="paid">Penalties Paid</option>
            </select>
            <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Refresh</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Booking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((row) => (
                  <tr key={row.bookingID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.bookingID}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.customerName || row.customerID}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(row.checkInDate).toLocaleDateString()} → {new Date(row.checkOutDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">${row.totalAmount}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.paymentStatus}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {row.paymentStatus !== "Paid Penalties" && row.paymentStatus !== "no penalties" ? (
                        <button
                          onClick={() => handlePayPenalty(row)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Mark Penalty Paid
                        </button>
                      ) : (
                        <span className="text-gray-500">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


