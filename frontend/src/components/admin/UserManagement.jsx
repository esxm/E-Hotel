import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useLoading } from '../../contexts/LoadingContext';

export default function UserManagement() {
  const { showLoading, hideLoading } = useLoading();
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [activeTab, setActiveTab] = useState('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // live computed stats maps
  const [customerStats, setCustomerStats] = useState({});
  const [managerStats, setManagerStats] = useState({});
  const [receptionistStats, setReceptionistStats] = useState({});

  // modals and forms
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    role: 'Customer',
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    idType: 'id_card',
    idNumber: '',
    balance: 0,
    hotelId: '', // for assignment where relevant
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      showLoading();
      const [customersRes, managersRes, receptionistsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/admin/managers'),
        api.get('/admin/receptionists')
      ]);
      setCustomers(customersRes.data || []);
      setManagers(managersRes.data || []);
      setReceptionists(receptionistsRes.data || []);
      await loadLiveStats();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      hideLoading();
    }
  }

  async function loadLiveStats() {
    try {
      const bookingsRes = await api.get('/admin/bookings');
      const bookings = bookingsRes.data || [];
      const custMap = {};
      bookings.forEach(b => {
        const cid = b.customerID || b.customerId;
        if (!cid) return;
        if (!custMap[cid]) custMap[cid] = { totalBookings: 0, totalSpent: 0, lastVisit: null };
        custMap[cid].totalBookings += 1;
        custMap[cid].totalSpent += b.totalAmount || 0;
        const d = new Date(b.checkOutDate || b.createdAt || Date.now());
        if (!custMap[cid].lastVisit || d > custMap[cid].lastVisit) custMap[cid].lastVisit = d;
      });
      setCustomerStats(custMap);

      const hotelsRes = await api.get('/hotels');
      const hotels = hotelsRes.data || [];
      const mMap = {};
      await Promise.all(hotels.map(async (h) => {
        if (h.managerId) {
          if (!mMap[h.managerId]) mMap[h.managerId] = { managedHotels: 0, totalRevenue: 0 };
          mMap[h.managerId].managedHotels += 1;
          try {
            const { data } = await api.get(`/admin/hotels/${h.hotelID}/analytics`);
            mMap[h.managerId].totalRevenue += data?.totalRevenue || 0;
          } catch {}
        }
      }));
      setManagerStats(mMap);

      const rMap = {};
      setReceptionistStats(rMap);
    } catch (e) {
      console.error('Failed loading live stats', e);
    }
  }

  const getFilteredAndSortedUsers = () => {
    let users = [];
    switch (activeTab) {
      case 'customers': users = customers; break;
      case 'managers': users = managers; break;
      case 'receptionists': users = receptionists; break;
      default: users = customers;
    }
    if (searchTerm) {
      users = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber?.includes(searchTerm)
      );
    }
    users.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
    return users;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const filteredUsers = getFilteredAndSortedUsers();

  const openCreate = (role) => {
    setForm({ role, name: '', email: '', phoneNumber: '', password: '', idType: 'id_card', idNumber: '', balance: 0, hotelId: '' });
    setCreateModal(true);
  };

  const openEdit = (role, user) => {
    setSelectedUser({ role, user });
    setForm({
      role,
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      password: '',
      idType: user.idType || 'id_card',
      idNumber: user.idNumber || '',
      balance: user.balance || 0,
      hotelId: '',
    });
    setEditModal(true);
  };

  async function submitCreate(e) {
    e.preventDefault();
    try {
      showLoading();
      if (form.role === 'Customer') {
        await api.post('/admin/customers', { name: form.name, email: form.email, password: form.password || '123456', phoneNumber: form.phoneNumber, idType: form.idType, idNumber: form.idNumber, balance: Number(form.balance) || 0 });
      } else if (form.role === 'Manager') {
        await api.post('/admin/managers', { name: form.name, email: form.email, password: form.password || '123456', phoneNumber: form.phoneNumber });
      } else if (form.role === 'Receptionist') {
        await api.post('/admin/receptionists', { name: form.name, email: form.email, password: form.password || '123456', phoneNumber: form.phoneNumber, hotelId: form.hotelId || null });
      }
      setCreateModal(false);
      await loadData();
    } catch (err) {
      console.error('Create failed', err);
    } finally { hideLoading(); }
  }

  async function submitEdit(e) {
    e.preventDefault();
    try {
      showLoading();
      const { role, user } = selectedUser;
      if (role === 'Customer') {
        await api.patch(`/admin/customers/${user.customerID}`, { name: form.name, phoneNumber: form.phoneNumber, idType: form.idType, idNumber: form.idNumber, balance: Number(form.balance) || 0 });
      } else if (role === 'Manager') {
        await api.patch(`/admin/managers/${user.managerID}`, { name: form.name, phoneNumber: form.phoneNumber });
      } else if (role === 'Receptionist') {
        await api.patch(`/admin/receptionists/${user.receptionistID}`, { name: form.name, phoneNumber: form.phoneNumber });
        if (form.hotelId !== '') {
          await api.post(`/admin/receptionists/${user.receptionistID}/assign`, { hotelId: form.hotelId || null });
        }
      }
      setEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      console.error('Edit failed', err);
    } finally { hideLoading(); }
  }

  async function removeUser(role, user) {
    try {
      showLoading();
      if (role === 'Customer') {
        await api.delete(`/admin/customers/${user.customerID}`);
      } else if (role === 'Manager') {
        await api.delete(`/admin/managers/${user.managerID}`);
      } else if (role === 'Receptionist') {
        await api.delete(`/admin/receptionists/${user.receptionistID}`);
      }
      await loadData();
    } catch (err) {
      console.error('Delete failed', err);
    } finally { hideLoading(); }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Management</h2>

      <div className="mb-6">
        <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button onClick={() => setActiveTab('customers')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>👥 Customers ({customers.length})</button>
          <button onClick={() => setActiveTab('managers')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'managers' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>👨‍💼 Managers ({managers.length})</button>
          <button onClick={() => setActiveTab('receptionists')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'receptionists' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>👩‍💼 Receptionists ({receptionists.length})</button>
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Users</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email, or phone..." className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="createdAt">Join Date</option>
              {activeTab === 'customers' && <option value="balance">Balance</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort Order</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex items-end justify-end">
            <div className="space-x-2">
              <button onClick={() => openCreate('Customer')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">+ Add Customer</button>
              <button onClick={() => openCreate('Manager')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">+ Add Manager</button>
              <button onClick={() => openCreate('Receptionist')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">+ Add Receptionist</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map(user => {
          let stats = {};
          let userType = '';
          if (activeTab === 'customers') {
            const s = customerStats[user.customerID] || { totalBookings: 0, totalSpent: 0, lastVisit: null };
            stats = { ...s, lastVisit: s.lastVisit ? new Date(s.lastVisit).toLocaleDateString() : '—' };
            userType = 'Customer';
          } else if (activeTab === 'managers') {
            const s = managerStats[user.managerID] || { managedHotels: 0, totalRevenue: 0 };
            stats = s; userType = 'Manager';
          } else if (activeTab === 'receptionists') {
            const s = receptionistStats[user.receptionistID] || { totalCheckIns: 0 };
            stats = s; userType = 'Receptionist';
          }
          return (
            <div key={user.customerID || user.managerID || user.receptionistID} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{userType}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {activeTab === 'customers' && (<><div className="text-center"><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalBookings}</p><p className="text-xs text-gray-500 dark:text-gray-400">Bookings</p></div><div className="text-center"><p className="text-2xl font-bold text-green-600 dark:text-green-400">${stats.totalSpent}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p></div><div className="text-center col-span-2"><p className="text-xs text-gray-500 dark:text-gray-400">Last Visit</p><p className="text-lg font-semibold">{stats.lastVisit}</p></div></>)}
                  {activeTab === 'managers' && (<><div className="text-center"><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.managedHotels}</p><p className="text-xs text-gray-500 dark:text-gray-400">Hotels</p></div><div className="text-center"><p className="text-2xl font-bold text-green-600 dark:text-green-400">${(stats.totalRevenue||0).toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p></div></>)}
                  {activeTab === 'receptionists' && (<><div className="text-center"><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCheckIns}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Check-ins</p></div></>)}
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-300">Phone:</span><span className="font-medium text-gray-900 dark:text-white">{user.phoneNumber || 'N/A'}</span></div>
                  {activeTab === 'customers' && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-300">Balance:</span><span className={`font-medium ${user.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${user.balance || 0}</span></div>)}
                </div>
                <div className="flex space-x-2">
                  <button onClick={()=>openEdit(userType, user)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md">Edit</button>
                  <button onClick={()=>removeUser(userType, user)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded-md">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add {form.role}</h3><button onClick={()=>setCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
            <form onSubmit={submitCreate} className="space-y-4">
              <div><label className="block text-sm mb-1">Name</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
              <div><label className="block text-sm mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Phone</label><input value={form.phoneNumber} onChange={e=>setForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                <div><label className="block text-sm mb-1">Password</label><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
              </div>
              {form.role === 'Customer' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><label className="block text-sm mb-1">ID Type</label><select value={form.idType} onChange={e=>setForm(p=>({...p,idType:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"><option value="id_card">ID Card</option><option value="passport">Passport</option><option value="driver_license">Driver License</option></select></div>
                  <div><label className="block text-sm mb-1">ID Number</label><input value={form.idNumber} onChange={e=>setForm(p=>({...p,idNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                  <div><label className="block text-sm mb-1">Balance</label><input type="number" min="0" value={form.balance} onChange={e=>setForm(p=>({...p,balance:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
        </div>
      )}
              {form.role === 'Receptionist' && (
                <div><label className="block text-sm mb-1">Assign to Hotel (optional)</label><input value={form.hotelId} onChange={e=>setForm(p=>({...p,hotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Hotel ID" /></div>
              )}
              <div className="flex justify-end space-x-2"><button type="button" onClick={()=>setCreateModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Create</button></div>
            </form>
              </div>
            </div>
      )}

      {editModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit {form.role}</h3><button onClick={()=>setEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button></div>
            <form onSubmit={submitEdit} className="space-y-4">
              <div><label className="block text-sm mb-1">Name</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" required /></div>
              <div><label className="block text-sm mb-1">Email</label><input type="email" value={form.email} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Phone</label><input value={form.phoneNumber} onChange={e=>setForm(p=>({...p,phoneNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                {form.role === 'Receptionist' && (<div><label className="block text-sm mb-1">Hotel Assignment</label><input value={form.hotelId} onChange={e=>setForm(p=>({...p,hotelId:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" placeholder="Hotel ID (blank to keep)" /></div>)}
              </div>
              {form.role === 'Customer' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><label className="block text-sm mb-1">ID Type</label><select value={form.idType} onChange={e=>setForm(p=>({...p,idType:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"><option value="id_card">ID Card</option><option value="passport">Passport</option><option value="driver_license">Driver License</option></select></div>
                  <div><label className="block text-sm mb-1">ID Number</label><input value={form.idNumber} onChange={e=>setForm(p=>({...p,idNumber:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
                  <div><label className="block text-sm mb-1">Balance</label><input type="number" min="0" value={form.balance} onChange={e=>setForm(p=>({...p,balance:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800" /></div>
            </div>
              )}
              <div className="flex justify-end space-x-2"><button type="button" onClick={()=>setEditModal(false)} className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button></div>
            </form>
            </div>
          </div>
      )}
    </div>
  );
}
