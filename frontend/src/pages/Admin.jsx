import { useEffect, useMemo, useState } from "react";
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
  const [hotels, setHotels] = useState([]);
  const [anomalyHotelId, setAnomalyHotelId] = useState("");
  const [anomalies, setAnomalies] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");
  const [overbookInput, setOverbookInput] = useState({ capacity: '', windowDays: 30 });
  const [overbookResult, setOverbookResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setErrorMsg("");
    try {
      showLoading();
      const [healthRes, adminStatsRes, hotelsRes] = await Promise.all([
        api.get("/health"),
        api.get("/admin/stats"),
        api.get("/hotels"),
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
      const hotelsList = hotelsRes.data || [];
      setHotels(hotelsList);
      if (hotelsList.length && !anomalyHotelId) {
        setAnomalyHotelId(hotelsList[0].hotelID);
      }
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || e.message);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    if (!anomalyHotelId) return;
    (async () => {
      try {
        const { data } = await api.get(`/ai/anomalies/${anomalyHotelId}`, { params: { days: 30 } });
        setAnomalies(data);
      } catch {}
      try {
        const { data: f } = await api.get(`/ai/revenue-forecast`, { params: { hotelId: anomalyHotelId } });
        setForecast(f);
      } catch {}
      try {
        const { data: t } = await api.get(`/admin/hotels/${anomalyHotelId}/todos`);
        setTodos(Array.isArray(t) ? t : []);
      } catch {}
    })();
  }, [anomalyHotelId]);

  // Keep todos in sync across roles/sessions with lightweight polling
  useEffect(() => {
    if (!anomalyHotelId) return;
    let timer = setInterval(async () => {
      try {
        const { data } = await api.get(`/admin/hotels/${anomalyHotelId}/todos`);
        setTodos(Array.isArray(data) ? data : []);
      } catch {}
    }, 10000); // 10s
    return () => clearInterval(timer);
  }, [anomalyHotelId]);

  const tabs = [
    { id: "overview", name: "System Overview", icon: "📊" },
    { id: "hotels", name: "Hotel Management", icon: "🏢" },
    { id: "rooms", name: "Room Management", icon: "🏨" },
    { id: "guests", name: "Guest Management", icon: "👥" },
    { id: "users", name: "User Management", icon: "👤" },
    { id: "analytics", name: "Analytics", icon: "📈" },
    { id: "ai", name: "AI Analytics", icon: "🤖" },
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
      case "ai":
        return (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI Anomaly Insights</h3>
              <div className="flex items-center gap-2">
                <select
                  value={anomalyHotelId}
                  onChange={(e)=>setAnomalyHotelId(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {hotels.map(h => (
                    <option key={h.hotelID} value={h.hotelID}>{h.name}</option>
                  ))}
                </select>
                <button
                  onClick={async ()=>{ if(!anomalyHotelId) return; try{ showLoading(); const { data } = await api.get(`/ai/anomalies/${anomalyHotelId}`, { params: { days: 30 } }); setAnomalies(data); } catch{} finally { hideLoading(); } }}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  Refresh
                </button>
                <button
                  onClick={generateReminders}
                  className="px-3 py-2 rounded bg-amber-600 text-white"
                >
                  Generate Guest Reminders
                </button>
                {forecast?.actions?.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const actions = forecast.actions || [];
                        if (!anomalyHotelId || actions.length === 0) return;
                        showLoading();
                        const created = await Promise.all(actions.map(async (text) => {
                          try {
                            const { data } = await api.post(`/admin/hotels/${anomalyHotelId}/todos`, { text });
                            return data;
                          } catch {
                            return null;
                          }
                        }));
                        setTodos((t) => [...created.filter(Boolean), ...t]);
                      } finally {
                        hideLoading();
                      }
                    }}
                    className="px-3 py-2 rounded bg-gray-700 text-white"
                  >
                    Add Actions to To‑Do
                  </button>
                )}
              </div>
            </div>
            {forecast && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="mb-6 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
            <div className="mb-6 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
                <button
                  onClick={async ()=>{ try { showLoading(); const { data } = await api.post('/ai/overbooking-sim', { hotelId: anomalyHotelId, capacity: Number(overbookInput.capacity), windowDays: Number(overbookInput.windowDays) }); setOverbookResult(data); } catch {} finally { hideLoading(); } }}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  Simulate
                </button>
              </div>
              {overbookResult && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="mb-1">Recommended buffer: <span className="font-semibold">{overbookResult.recommendedBuffer}</span> rooms</div>
                  <div className="mb-1">{overbookResult.rationale}</div>
                  <div className="mb-1">Inputs: capacity <span className="font-semibold">{overbookInput.capacity}</span>, window {overbookInput.windowDays}d · cancel rate {(Math.round((overbookResult.cancelRate||0)*1000)/10).toFixed(1)}% · no‑show rate {(Math.round((overbookResult.noShowRate||0)*1000)/10).toFixed(1)}%</div>
                  {Array.isArray(overbookResult.notes) && overbookResult.notes.length>0 && (
                    <ul className="list-disc ml-5">
                      {overbookResult.notes.map((n,i)=>(<li key={i}>{n}</li>))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {/* To-Do list */}
            <div className="mb-6 p-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">To‑Do</div>
                <div className="flex items-center gap-2">
                  <input
                    value={todoInput}
                    onChange={(e)=>setTodoInput(e.target.value)}
                    placeholder="Add a note (e.g., Send deposit reminders)"
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={async ()=>{ const text = todoInput.trim(); if(!text) return; try { const { data } = await api.post(`/admin/hotels/${anomalyHotelId}/todos`, { text }); setTodos(ts=>[data, ...ts]); setTodoInput(''); } catch {} }}
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
              {todos.length === 0 ? (
                <p className="text-sm text-gray-500">No to‑do items yet. Use “Add Actions to To‑Do” or add a note.</p>
              ) : (
                <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
                  {todos.map(item => (
                    <li key={item.todoID || item.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!item.completed} onChange={async (e)=>{ try { const { data } = await api.patch(`/admin/todos/${item.todoID}`, { completed: e.target.checked }); setTodos(ts=>ts.map(x=> x.todoID===item.todoID? data : x)); } catch {} }} />
                        <span className={item.completed ? 'line-through opacity-70' : ''}>{item.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={async ()=>{ const newText = prompt('Edit note', item.text); if(newText===null) return; try { const { data } = await api.patch(`/admin/todos/${item.todoID}`, { text: newText }); setTodos(ts=>ts.map(x=> x.todoID===item.todoID? data : x)); } catch {} }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Edit</button>
                        <button onClick={async ()=>{ try { await api.delete(`/admin/todos/${item.todoID}`); setTodos(ts=>ts.filter(x=>x.todoID!==item.todoID)); } catch {} }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {anomalies ? (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{anomalies.summary}</p>
                {Array.isArray(anomalies.series) && anomalies.series.length > 2 && (
                  <div className="mb-3">
                    <AnomalySparkline data={anomalies.series} anomalies={anomalies.anomalies||[]} />
                  </div>
                )}
                {Array.isArray(anomalies.anomalies) && anomalies.anomalies.length > 0 ? (
                  <ul className="text-sm list-disc ml-5 text-gray-700 dark:text-gray-300">
                    {anomalies.anomalies.map((a, idx) => (
                      <li key={idx}>{a.date}: {a.metric} {a.type} (sev {a.severity}) – {a.reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No anomalies detected in the recent window.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a hotel to analyze.</p>
            )}
            {/* Reminders Modal */}
            {remindersOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">High‑Risk Guest Reminders</h4>
                    <button onClick={()=>setRemindersOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
                  </div>
                  {reminderLoading ? (
                    <p className="text-sm text-gray-500">Generating…</p>
                  ) : reminders.length === 0 ? (
                    <p className="text-sm text-gray-500">No high‑risk guests found for this hotel right now.</p>
                  ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-auto">
                      <div className="text-right mb-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(reminders.map(r=>r.message).join("\n\n")).catch(()=>{})}
                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                        >
                          Copy All
                        </button>
                      </div>
                      {reminders.map((r, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{r.customerName} · Room {r.roomNumber || '-'} · {r.riskLabel} ({r.riskScore}%)</div>
                            <button
                              onClick={() => navigator.clipboard.writeText(r.message).catch(()=>{})}
                              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Check‑in {r.checkIn} · Check‑out {r.checkOut} · Email {r.customerEmail || 'N/A'} · Phone {r.customerPhone || 'N/A'}</div>
                          <div className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{r.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
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

// Inline sparkline component reused from Manager
function AnomalySparkline({ data, anomalies }) {
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
    const circles = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d.bookings), date: d.date }));
    const anomalyDates = new Set((anomalies||[]).map(a => a.date));
    const marks = circles.filter(c => anomalyDates.has(c.date));
    return { w, h, path, marks };
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

// Helpers
function formatDateShort(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

async function generateRiskForBooking(api, bookingId) {
  try {
    const { data } = await api.post(`/ai/cancel-risk/${bookingId}`);
    return data;
  } catch {
    return null;
  }
}

// NOTE: this function is hoisted and used inside the component through closure vars
async function generateReminders() {
  // This function relies on module-scope bindings; we’ll re-query minimal data here
  try {
    const hotelsRes = await api.get('/hotels');
    const hotels = hotelsRes.data || [];
    const selected = hotels.find(h => h.hotelID === (typeof anomalyHotelId !== 'undefined' ? anomalyHotelId : '')) || hotels[0];
    if (!selected) return;
    // Get bookings for selected hotel
    setReminderLoading?.(true);
    setRemindersOpen?.(true);
    const bRes = await api.get(`/hotels/${selected.hotelID}/bookings`);
    const bookings = bRes.data || [];
    const booked = bookings.filter(b => b.status === 'booked');
    const top = booked.slice(0, 20); // limit for speed
    const results = await Promise.all(top.map(async (b) => {
      const risk = await generateRiskForBooking(api, b.bookingID);
      if (!risk) return null;
      if ((risk.riskScore||0) < 40) return null; // only medium/high
      const name = b.customerName || b.customerDetails?.name || 'Guest';
      const msg = (risk.messageTemplate || 'Hello {{name}}, we look forward to your stay on {{checkIn}}.').replace('{{name}}', name).replace('{{checkIn}}', formatDateShort(b.checkInDate));
      return {
        bookingID: b.bookingID,
        customerName: name,
        customerEmail: b.customerEmail || b.customerDetails?.email,
        customerPhone: b.customerPhone || b.customerDetails?.phoneNumber,
        roomNumber: b.roomNumber || (Array.isArray(b.roomDetails) && b.roomDetails[0]?.roomNumber),
        checkIn: formatDateShort(b.checkInDate),
        checkOut: formatDateShort(b.checkOutDate),
        riskLabel: risk.label,
        riskScore: risk.riskScore,
        message: msg
      };
    }));
    setReminders?.(results.filter(Boolean));
  } catch (e) {
    // silently ignore
  } finally {
    setReminderLoading?.(false);
  }
}


