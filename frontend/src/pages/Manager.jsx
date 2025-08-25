import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useLoading } from "../contexts/LoadingContext";

export default function Manager() {
  const { showLoading, hideLoading } = useLoading();
  const [hotels, setHotels] = useState([]);
  const [activeHotelId, setActiveHotelId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState({
    roomsAvailable: 0,
    roomsOccupied: 0,
    roomsBooked: 0,
    totalReceptionists: 0,
    activeBookings: 0,
    cancelledBookings: 0,
  });
  const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [anomalies, setAnomalies] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");
  const [overbookInput, setOverbookInput] = useState({ capacity: '', windowDays: 30 });
  const [overbookResult, setOverbookResult] = useState(null);
  const [roomsCount, setRoomsCount] = useState(0);
  const [receptionists, setReceptionists] = useState([]);
  const [recCreateOpen, setRecCreateOpen] = useState(false);
  const [recEditOpen, setRecEditOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [recForm, setRecForm] = useState({ name: '', email: '', phoneNumber: '', password: '' });

  // Room modals
  const [roomCreateOpen, setRoomCreateOpen] = useState(false);
  const [roomEditOpen, setRoomEditOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({ roomNumber: "", type: "standard", pricePerNight: 0, floor: "" });

  // Hotel settings modal
  const [hotelEditOpen, setHotelEditOpen] = useState(false);
  const [hotelForm, setHotelForm] = useState({ name: "", address: "", starRating: 3, totalRooms: 0, phone: "", email: "", description: "" });

  // UI helpers for colored badges/cards
  const roomStatusPill = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'booked':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const metricCardClass = (type) => {
    switch (type) {
      case 'available':
        return 'border-green-300 dark:border-green-700';
      case 'occupied':
        return 'border-red-300 dark:border-red-700';
      case 'booked':
        return 'border-blue-300 dark:border-blue-700';
      case 'active':
        return 'border-blue-300 dark:border-blue-700';
      case 'cancelled':
        return 'border-red-300 dark:border-red-700';
      case 'warning':
        return 'border-amber-300 dark:border-amber-700';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    if (!activeHotelId) return;
    loadStats();
    loadRooms();
    loadBookings();
    buildOverview();
    fetchAnomalies();
    fetchForecast();
    fetchTodos();
    (async ()=>{ try { const { data: rooms } = await api.get(`/hotels/${activeHotelId}/rooms`); const count = Array.isArray(rooms)?rooms.length:0; setRoomsCount(count); setOverbookInput(p=>({ ...p, capacity: p.capacity || String(count) })); } catch {} })();
    // Do not load receptionists here to avoid unnecessary calls when tab not active
  }, [activeHotelId]);

  // Load receptionists when the Reception tab is active or hotel changes
  useEffect(() => {
    if (activeTab !== 'reception') return;
    if (!activeHotelId) return;
    loadReceptionists();
  }, [activeTab, activeHotelId]);

  async function loadHotels() {
    try {
      showLoading();
      const { data } = await api.get("/hotels");
      setHotels(data || []);
      if (data && data.length > 0) {
        setActiveHotelId(data[0].hotelID);
      }
    } catch (e) {
      console.error("Failed to load hotels", e);
    } finally {
      hideLoading();
    }
  }

  async function loadStats(y = period.year, m = period.month) {
    if (!activeHotelId) return;
    try {
      showLoading();
      const { data } = await api.get(`/hotels/${activeHotelId}/stats/monthly`, { params: { year: y, month: m } });
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      hideLoading();
    }
  }

  async function loadRooms() {
    if (!activeHotelId) return;
    try {
      showLoading();
      const { data } = await api.get(`/hotels/${activeHotelId}/rooms`);
      setRooms(data || []);
      // Update part of overview
      const available = (data || []).filter(r=>r.status==='available').length;
      const occupied = (data || []).filter(r=>r.status==='occupied').length;
      const booked = (data || []).filter(r=>r.status==='booked').length;
      setOverview(o=>({ ...o, roomsAvailable: available, roomsOccupied: occupied, roomsBooked: booked }));
    } catch (e) {
      console.error("Failed to load rooms", e);
    } finally {
      hideLoading();
    }
  }

  async function loadBookings() {
    if (!activeHotelId) return;
    try {
      showLoading();
      const { data } = await api.get(`/hotels/${activeHotelId}/bookings`);
      setBookings(data || []);
      const active = (data||[]).filter(b=>b.status==='checked-in').length;
      const cancelled = (data||[]).filter(b=>b.status==='cancelled').length;
      setOverview(o=>({ ...o, activeBookings: active, cancelledBookings: cancelled }));
    } catch (e) {
      console.error("Failed to load bookings", e);
    } finally {
      hideLoading();
    }
  }

  async function loadReceptionists() {
    if (!activeHotelId) return;
    try {
      showLoading();
      const { data } = await api.get(`/managers/${activeHotelId}/receptionists`);
      setReceptionists(data || []);
      setOverview(o=>({ ...o, totalReceptionists: (data||[]).length }));
    } catch (e) {
      console.error('Failed to load receptionists', e);
    } finally {
      hideLoading();
    }
  }

  async function buildOverview() {
    try {
      // Fire a lightweight analytics call to ensure we have something if rooms/bookings not yet loaded
      const { data } = await api.get(`/managers/${activeHotelId}/analytics`);
      setOverview(o=>({
        roomsAvailable: data.availableRooms ?? o.roomsAvailable,
        roomsOccupied: data.occupiedRooms ?? o.roomsOccupied,
        roomsBooked: o.roomsBooked, // booked is derived from rooms endpoint; keep existing
        totalReceptionists: o.totalReceptionists,
        activeBookings: data.activeBookings ?? o.activeBookings,
        cancelledBookings: data.cancelledBookings ?? o.cancelledBookings,
      }));
    } catch {}
  }

  async function fetchAnomalies() {
    if (!activeHotelId) return;
    try {
      const { data } = await api.get(`/ai/anomalies/${activeHotelId}`, { params: { days: 30 } });
      setAnomalies(data);
    } catch (e) {
      // non-blocking
    }
  }

  async function fetchForecast() {
    if (!activeHotelId) return;
    try {
      const { data } = await api.get(`/ai/revenue-forecast`, { params: { hotelId: activeHotelId } });
      setForecast(data);
    } catch {}
  }

  async function fetchTodos() {
    if (!activeHotelId) return;
    try { const { data } = await api.get(`/managers/${activeHotelId}/todos`); setTodos(Array.isArray(data)?data:[]); } catch {}
  }

  // Poll to keep in sync with admin updates
  useEffect(() => {
    if (!activeHotelId) return;
    let timer = setInterval(async () => {
      try { const { data } = await api.get(`/managers/${activeHotelId}/todos`); setTodos(Array.isArray(data)?data:[]); } catch {}
    }, 10000);
    return () => clearInterval(timer);
  }, [activeHotelId]);

  // Room actions
  async function createRoom(e) {
    e.preventDefault();
    try {
      showLoading();
      await api.post(`/hotels/${activeHotelId}/rooms`, {
        roomNumber: roomForm.roomNumber,
        type: roomForm.type,
        pricePerNight: Number(roomForm.pricePerNight) || 0,
        floor: roomForm.floor || null,
      });
      setRoomCreateOpen(false);
      setRoomForm({ roomNumber: "", type: "standard", pricePerNight: 0, floor: "" });
      await loadRooms();
    } catch (e) {
      console.error("Create room failed", e);
    } finally { hideLoading(); }
  }

  async function saveRoom(e) {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      showLoading();
      await api.patch(`/hotels/${activeHotelId}/rooms/${selectedRoom.roomID}`, {
        type: roomForm.type,
        pricePerNight: Number(roomForm.pricePerNight) || 0,
        floor: roomForm.floor || null,
      });
      setRoomEditOpen(false);
      setSelectedRoom(null);
      await loadRooms();
    } catch (e) {
      console.error("Update room failed", e);
    } finally { hideLoading(); }
  }

  async function setRoomStatus(room, status) {
    try {
      showLoading();
      await api.patch(`/hotels/${activeHotelId}/rooms/${room.roomID}`, { status });
      await loadRooms();
    } catch (e) {
      console.error("Set room status failed", e);
    } finally { hideLoading(); }
  }

  // Hotel actions
  function openHotelEdit() {
    const h = hotels.find(h => h.hotelID === activeHotelId);
    if (!h) return;
    setHotelForm({
      name: h.name || "",
      address: h.address || "",
      starRating: h.starRating || 3,
      totalRooms: h.totalRooms || 0,
      phone: h.phone || "",
      email: h.email || "",
      description: h.description || "",
    });
    setHotelEditOpen(true);
  }

  async function saveHotel(e) {
    e.preventDefault();
    try {
      showLoading();
      await api.patch(`/hotels/${activeHotelId}`, hotelForm);
      setHotelEditOpen(false);
      await loadHotels();
    } catch (e) {
      console.error("Save hotel failed", e);
    } finally { hideLoading(); }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Manager Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage your hotel operations, rooms, and performance</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">{(hotels.find(h=>h.hotelID===activeHotelId)?.name) || ""}</span>
            {/* Managers cannot switch hotels; only view current */}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            {[
              { id: "overview", name: "Overview" },
              { id: "rooms", name: "Rooms" },
              { id: "bookings", name: "Bookings" },
              { id: "reception", name: "Receptionists" },
            ].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab===t.id ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"}`}>{t.name}</button>
            ))}
          </nav>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select value={period.year} onChange={(e)=>{ const y = Number(e.target.value); setPeriod(p=>({...p,year:y})); loadStats(y, period.month); }} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {Array.from({length:5}).map((_,i)=>{ const y = new Date().getFullYear()-i; return <option key={y} value={y}>{y}</option>; })}
              </select>
              <select value={period.month} onChange={(e)=>{ const m = Number(e.target.value); setPeriod(p=>({...p,month:m})); loadStats(period.year, m); }} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {Array.from({length:12}).map((_,i)=>{ const m = i+1; return <option key={m} value={m}>{String(m).padStart(2,'0')}</option>; })}
              </select>
              <button onClick={()=>loadStats()} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Refresh</button>
            </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass()}`}><div className="text-xs text-gray-500">Revenue</div><div className="text-2xl font-bold">${(stats?.totalRevenue||0).toLocaleString()}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('warning')}`}><div className="text-xs text-gray-500">Occupancy (current)</div><div className="text-2xl font-bold">{(() => { const total = (overview.roomsAvailable||0) + (overview.roomsOccupied||0) + (overview.roomsBooked||0); const pct = total ? (overview.roomsOccupied/total)*100 : 0; return pct.toFixed(1); })()}%</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('cancelled')}`}><div className="text-xs text-gray-500">Cancellations (month)</div><div className="text-2xl font-bold">{stats?.cancellationCount||0}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('available')}`}><div className="text-xs text-gray-500">Rooms Available</div><div className="text-2xl font-bold">{overview.roomsAvailable}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('occupied')}`}><div className="text-xs text-gray-500">Rooms Occupied</div><div className="text-2xl font-bold">{overview.roomsOccupied}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('booked')}`}><div className="text-xs text-gray-500">Rooms Booked</div><div className="text-2xl font-bold">{overview.roomsBooked}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass()}`}><div className="text-xs text-gray-500">Receptionists</div><div className="text-2xl font-bold">{overview.totalReceptionists}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('active')}`}><div className="text-xs text-gray-500">Active Bookings</div><div className="text-2xl font-bold">{overview.activeBookings}</div></div>
              <div className={`p-4 rounded bg-white dark:bg-gray-800 border ${metricCardClass('cancelled')}`}><div className="text-xs text-gray-500">Cancelled Bookings</div><div className="text-2xl font-bold">{overview.cancelledBookings}</div></div>
            </div>
            {forecast && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Projected Revenue ({forecast.month})</div>
                  <div className="text-2xl font-bold">${Math.round(forecast.projectedRevenue||0).toLocaleString()}</div>
                </div>
                <div className="p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Goal</div>
                  <div className={`text-2xl font-bold ${((forecast.gap||0) > 0)?'text-red-600':'text-green-600'}`}>${Math.round(forecast.goal||0).toLocaleString()}</div>
                </div>
                <div className="p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Gap</div>
                  <div className={`text-2xl font-bold ${((forecast.gap||0) > 0)?'text-red-600':'text-green-600'}`}>${Math.round(forecast.gap||0).toLocaleString()}</div>
                </div>
              </div>
            )}
            {forecast && Array.isArray(forecast.actions) && forecast.actions.length > 0 && (
              <div className="mt-3 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {forecast.summary && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{forecast.summary}</div>
                )}
                <div className="text-sm font-medium mb-1 text-gray-900 dark:text-white">Recommended actions</div>
                <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
                  {forecast.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const text = `${forecast.summary || ''}\n\nActions:\n- ${forecast.actions.join('\n- ')}`;
                      navigator.clipboard.writeText(text).catch(()=>{});
                    }}
                    className="px-3 py-2 rounded bg-gray-700 text-white text-sm"
                  >
                    Copy Actions
                  </button>
                </div>
              </div>
            )}
            {/* Overbooking Simulator */}
            <div className="mt-4 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Overbooking Risk Simulator</div>
              <div className="flex flex-wrap items-end gap-2 mb-2">
                <div>
                  <label className="block text-xs mb-1">Capacity</label>
                  <input value={overbookInput.capacity} onChange={(e)=>setOverbookInput(p=>({...p, capacity:e.target.value}))} type="number" min="0" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" placeholder="Total rooms" />
                </div>
                <div>
                  <label className="block text-xs mb-1">Window (days)</label>
                  <input value={overbookInput.windowDays} onChange={(e)=>setOverbookInput(p=>({...p, windowDays:e.target.value}))} type="number" min="7" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setOverbookInput(p=>({...p, windowDays: 30 }))} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs">30d</button>
                  <button onClick={()=>setOverbookInput(p=>({...p, windowDays: 60 }))} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs">60d</button>
                  <button onClick={()=>setOverbookInput(p=>({...p, windowDays: 90 }))} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs">90d</button>
                </div>
                <button onClick={async ()=>{ try { showLoading(); const { data } = await api.post('/ai/overbooking-sim', { hotelId: activeHotelId, capacity: Number(overbookInput.capacity), windowDays: Number(overbookInput.windowDays) }); setOverbookResult(data); } catch {} finally { hideLoading(); } }} className="px-3 py-2 rounded bg-blue-600 text-white">Simulate</button>
              </div>
              {overbookResult && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="mb-1">Recommended buffer: <span className="font-semibold">{overbookResult.recommendedBuffer}</span> rooms</div>
                  <div className="mb-1">{overbookResult.rationale}</div>
                  <div className="mb-1">Inputs: capacity <span className="font-semibold">{overbookInput.capacity||roomsCount}</span>, window {overbookInput.windowDays}d · cancel rate {(Math.round((overbookResult.cancelRate||0)*1000)/10).toFixed(1)}% · no‑show rate {(Math.round((overbookResult.noShowRate||0)*1000)/10).toFixed(1)}%</div>
                  {Array.isArray(overbookResult.notes) && overbookResult.notes.length>0 && (
                    <ul className="list-disc ml-5">
                      {overbookResult.notes.map((n,i)=>(<li key={i}>{n}</li>))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {/* To-Do list */}
            <div className="mt-4 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">To‑Do</div>
                <div className="flex items-center gap-2">
                  <input value={todoInput} onChange={(e)=>setTodoInput(e.target.value)} placeholder="Add a note" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                  <button onClick={async ()=>{ const text = todoInput.trim(); if(!text) return; try { const { data } = await api.post(`/managers/${activeHotelId}/todos`, { text }); setTodos(ts=>[data, ...ts]); setTodoInput(''); } catch {} }} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Add</button>
                </div>
              </div>
              {todos.length === 0 ? (
                <p className="text-sm text-gray-500">No to‑do items yet.</p>
              ) : (
                <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
                  {todos.map(item => (
                    <li key={item.todoID} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!item.completed} onChange={async (e)=>{ try { const { data } = await api.patch(`/managers/todos/${item.todoID}`, { completed: e.target.checked }); setTodos(ts=>ts.map(x=> x.todoID===item.todoID? data : x)); } catch {} }} />
                        <span className={item.completed ? 'line-through opacity-70' : ''}>{item.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={async ()=>{ const newText = prompt('Edit note', item.text); if(newText===null) return; try { const { data } = await api.patch(`/managers/todos/${item.todoID}`, { text: newText }); setTodos(ts=>ts.map(x=> x.todoID===item.todoID? data : x)); } catch {} }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Edit</button>
                        <button onClick={async ()=>{ try { await api.delete(`/managers/todos/${item.todoID}`); setTodos(ts=>ts.filter(x=>x.todoID!==item.todoID)); } catch {} }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {anomalies && (
              <div className="mt-4 p-4 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                <div className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-2">AI Anomaly Insights</div>
                <div className="text-sm text-amber-900 dark:text-amber-200 mb-2">{anomalies.summary}</div>
                {Array.isArray(anomalies.series) && anomalies.series.length > 2 && (
                  <div className="mb-3">
                    <AnomalySparkline data={anomalies.series} anomalies={anomalies.anomalies||[]} />
                  </div>
                )}
                {Array.isArray(anomalies.anomalies) && anomalies.anomalies.length > 0 && (
                  <ul className="text-sm list-disc ml-5 text-amber-900 dark:text-amber-200">
                    {anomalies.anomalies.map((a, idx) => (
                      <li key={idx}>{a.date}: {a.metric} {a.type} (sev {a.severity}) – {a.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Receptionists */}
        {activeTab === 'reception' && (
          <div className="space-y-4">
            <div className="text-right"><button onClick={()=>{ setRecForm({ name: '', email: '', phoneNumber: '', password: '' }); setRecCreateOpen(true); }} className="px-4 py-2 rounded bg-blue-600 text-white">+ Add Receptionist</button></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {receptionists.map(r => (
                    <tr key={r.receptionistID}>
                      <td className="px-6 py-3 text-sm">{r.name}</td>
                      <td className="px-6 py-3 text-sm">{r.email}</td>
                      <td className="px-6 py-3 text-sm">{r.phoneNumber || '-'}</td>
                      <td className="px-6 py-3 text-sm space-x-2">
                        <button onClick={()=>{ setSelectedRec(r); setRecForm({ name: r.name||'', email: r.email||'', phoneNumber: r.phoneNumber||'', password: '' }); setRecEditOpen(true); }} className="text-blue-600">Edit</button>
                        <button onClick={async ()=>{ if (confirm('Delete?')) { try { showLoading(); await api.delete(`/managers/${activeHotelId}/receptionists/${r.receptionistID}`); await loadReceptionists(); } catch(e){ console.error(e);} finally { hideLoading(); } } }} className="text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rooms */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <div className="text-right"><button onClick={()=>{ setRoomForm({ roomNumber: "", type: "standard", pricePerNight: 0, floor: "" }); setRoomCreateOpen(true); }} className="px-4 py-2 rounded bg-blue-600 text-white">+ Add Room</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(r => (
                <div key={r.roomID || r.roomNumber} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Room {r.roomNumber}</div>
                      <div className="text-xs text-gray-500">{r.type}</div>
                    </div>
                    <span className="text-sm">${r.pricePerNight || 0}/night</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className={`px-2 py-0.5 rounded-full ${roomStatusPill(r.status)}`}>{r.status}</span>
                    <span>Floor: {r.floor ?? '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{ setSelectedRoom(r); setRoomForm({ roomNumber: r.roomNumber, type: r.type, pricePerNight: r.pricePerNight || 0, floor: r.floor || "" }); setRoomEditOpen(true); }} className="flex-1 px-3 py-2 rounded bg-blue-600 text-white text-xs">Edit</button>
                    <button onClick={()=>setRoomStatus(r, r.status === 'maintenance' ? 'available' : 'maintenance')} className="flex-1 px-3 py-2 rounded bg-yellow-600 text-white text-xs">{r.status === 'maintenance' ? 'Mark Available' : 'Maintenance'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings (read-only for manager) */}
        {activeTab === "bookings" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium">Room(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.map(b => (
                  <tr key={b.bookingID || `${b.customerID}-${b.checkInDate}` }>
                    <td className="px-6 py-3 text-sm">{b.customerID}</td>
                    <td className="px-6 py-3 text-sm">{Array.isArray(b.roomDetails) ? b.roomDetails.length : '-'}</td>
                    <td className="px-6 py-3 text-sm">{new Date(b.checkInDate).toLocaleDateString()} → {new Date(b.checkOutDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-sm">${b.totalAmount || 0}</td>
                    <td className="px-6 py-3 text-sm">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        {roomCreateOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Room</h3><button onClick={()=>setRoomCreateOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
              <form onSubmit={createRoom} className="space-y-3">
                <div><label className="block text-sm mb-1">Room Number</label><input value={roomForm.roomNumber} onChange={e=>setRoomForm(p=>({...p,roomNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Type</label><select value={roomForm.type} onChange={e=>setRoomForm(p=>({...p,type:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"><option value="standard">Standard</option><option value="double">Double</option><option value="suite">Suite</option><option value="presidential">Presidential</option></select></div>
                <div><label className="block text-sm mb-1">Price per Night ($)</label><input type="number" min="0" value={roomForm.pricePerNight} onChange={e=>setRoomForm(p=>({...p,pricePerNight:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Floor</label><input value={roomForm.floor} onChange={e=>setRoomForm(p=>({...p,floor:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div className="text-right space-x-2"><button type="button" onClick={()=>setRoomCreateOpen(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Create</button></div>
              </form>
            </div>
          </div>
        )}

        {roomEditOpen && selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Room {selectedRoom.roomNumber}</h3><button onClick={()=>setRoomEditOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
              <form onSubmit={saveRoom} className="space-y-3">
                <div><label className="block text-sm mb-1">Type</label><select value={roomForm.type} onChange={e=>setRoomForm(p=>({...p,type:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"><option value="standard">Standard</option><option value="double">Double</option><option value="suite">Suite</option><option value="presidential">Presidential</option></select></div>
                <div><label className="block text-sm mb-1">Price per Night ($)</label><input type="number" min="0" value={roomForm.pricePerNight} onChange={e=>setRoomForm(p=>({...p,pricePerNight:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Floor</label><input value={roomForm.floor} onChange={e=>setRoomForm(p=>({...p,floor:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div className="text-right space-x-2"><button type="button" onClick={()=>setRoomEditOpen(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button></div>
              </form>
            </div>
          </div>
        )}

        {hotelEditOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Hotel</h3><button onClick={()=>setHotelEditOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
              <form onSubmit={saveHotel} className="space-y-3">
                <div><label className="block text-sm mb-1">Name</label><input value={hotelForm.name} onChange={e=>setHotelForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-sm mb-1">Stars</label><select value={hotelForm.starRating} onChange={e=>setHotelForm(p=>({...p,starRating:Number(e.target.value)}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">{[1,2,3,4,5].map(s=> <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="block text-sm mb-1">Total Rooms</label><input type="number" min="1" value={hotelForm.totalRooms} onChange={e=>setHotelForm(p=>({...p,totalRooms:Number(e.target.value)}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                </div>
                <div><label className="block text-sm mb-1">Phone</label><input value={hotelForm.phone} onChange={e=>setHotelForm(p=>({...p,phone:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div><label className="block text-sm mb-1">Email</label><input type="email" value={hotelForm.email} onChange={e=>setHotelForm(p=>({...p,email:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div><label className="block text-sm mb-1">Address</label><input value={hotelForm.address} onChange={e=>setHotelForm(p=>({...p,address:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Description</label><textarea value={hotelForm.description} onChange={e=>setHotelForm(p=>({...p,description:e.target.value}))} rows={3} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div className="text-right space-x-2"><button type="button" onClick={()=>setHotelEditOpen(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button></div>
              </form>
            </div>
          </div>
        )}

        {recCreateOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Receptionist</h3><button onClick={()=>setRecCreateOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
              <form onSubmit={async (e)=>{ e.preventDefault(); try { showLoading(); await api.post(`/managers/${activeHotelId}/receptionists`, { name: recForm.name, email: recForm.email, phoneNumber: recForm.phoneNumber, password: recForm.password || '123456' }); setRecCreateOpen(false); await loadReceptionists(); } catch (err) { console.error('Create receptionist failed', err);} finally { hideLoading(); } }} className="space-y-3">
                <div><label className="block text-sm mb-1">Name</label><input value={recForm.name} onChange={e=>setRecForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Email</label><input type="email" value={recForm.email} onChange={e=>setRecForm(p=>({...p,email:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-sm mb-1">Phone</label><input value={recForm.phoneNumber} onChange={e=>setRecForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                  <div><label className="block text-sm mb-1">Password</label><input type="password" value={recForm.password} onChange={e=>setRecForm(p=>({...p,password:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                </div>
                <div className="text-right space-x-2"><button type="button" onClick={()=>setRecCreateOpen(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Create</button></div>
              </form>
            </div>
          </div>
        )}

        {recEditOpen && selectedRec && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Receptionist</h3><button onClick={()=>setRecEditOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
              <form onSubmit={async (e)=>{ e.preventDefault(); try { showLoading(); await api.patch(`/managers/${activeHotelId}/receptionists/${selectedRec.receptionistID}`, { name: recForm.name, phoneNumber: recForm.phoneNumber }); setRecEditOpen(false); setSelectedRec(null); await loadReceptionists(); } catch (err) { console.error('Update receptionist failed', err);} finally { hideLoading(); } }} className="space-y-3">
                <div><label className="block text-sm mb-1">Name</label><input value={recForm.name} onChange={e=>setRecForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
                <div><label className="block text-sm mb-1">Email</label><input type="email" value={recForm.email} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700" /></div>
                <div><label className="block text-sm mb-1">Phone</label><input value={recForm.phoneNumber} onChange={e=>setRecForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div className="text-right space-x-2"><button type="button" onClick={()=>setRecEditOpen(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline sparkline component for anomalies
function AnomalySparkline({ data, anomalies }) {
  // data: [{ date, bookings, cancels }]
  // map to x/y
  const points = useMemo(() => {
    const vals = data.map(d => d.bookings);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const w = 500;
    const h = 80;
    const pad = 6;
    const scaleX = (i) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const scaleY = (v) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.bookings)}`).join(' ');
    const circles = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d.bookings), date: d.date, v: d.bookings }));
    // mark anomaly dates
    const anomalyDates = new Set((anomalies||[]).map(a => a.date));
    const marks = circles.filter(c => anomalyDates.has(c.date));
    return { w, h, path, marks, min, max };
  }, [data, anomalies]);

  return (
    <svg width={points.w} height={points.h} viewBox={`0 0 ${points.w} ${points.h}`} className="block">
      <path d={points.path} fill="none" stroke="#2563eb" strokeWidth="2" />
      {points.marks.map((m, idx) => (
        <circle key={idx} cx={m.x} cy={m.y} r="3" fill="#dc2626" />
      ))}
    </svg>
  );
}


