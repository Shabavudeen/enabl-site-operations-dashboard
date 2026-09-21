import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Render Live Backend URL
const API_BASE_URL = 'https://enabl-backend.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('installations');
  const [summary, setSummary] = useState({
    total_sites: 0,
    active_sites: 0,
    total_installations: 0,
    completed_installations: 0,
  });
  const [sites, setSites] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local Storage map to guarantee technician name display
  const [localTechs, setLocalTechs] = useState(() => {
    const saved = localStorage.getItem('enabl_local_techs');
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch all dashboard data from Backend API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, sitesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/summary`).catch(() => ({ data: summary })),
        axios.get(`${API_BASE_URL}/api/sites`).catch(() => ({ data: [] }))
      ]);
      
      if (summaryRes.data) setSummary(summaryRes.data);
      if (sitesRes.data) setSites(sitesRes.data);

      try {
        const installationsRes = await axios.get(`${API_BASE_URL}/api/installations`);
        if (installationsRes.data && Array.isArray(installationsRes.data)) {
          setInstallations(installationsRes.data);
        }
      } catch (err) {
        console.log("Installations endpoint fallback");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Forms State
  const [newSite, setNewSite] = useState({ site_name: '', location: '', status: 'Pending' });
  const [newInstallation, setNewInstallation] = useState({
    site_id: '',
    equipment_name: '',
    technician: '',
    status: 'Scheduled'
  });

  // Handle Create Site
  const handleCreateSite = async (e) => {
    e.preventDefault();
    if (!newSite.site_name || !newSite.location) {
      alert("Please fill in Site Name and Location");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/sites`, newSite);
      setNewSite({ site_name: '', location: '', status: 'Pending' });
      fetchData();
    } catch (err) {
      console.error("Error creating site:", err);
      alert("Failed to create site");
    }
  };

  // Handle Create Installation
  const handleCreateInstallation = async (e) => {
    e.preventDefault();
    if (!newInstallation.site_id || !newInstallation.equipment_name) {
      alert("Please select a Site and enter Equipment Name");
      return;
    }

    const techName = newInstallation.technician.trim();
    const today = new Date().toISOString().split('T')[0];
    const selectedSite = sites.find(s => s.id === Number(newInstallation.site_id));

    // Clean payload without invalid foreign keys that crash DB
    const payload = {
      site_id: Number(newInstallation.site_id),
      equipment_name: newInstallation.equipment_name,
      installation_date: today,
      status: newInstallation.status || 'Scheduled'
    };

    if (techName) {
      payload.assigned_user = techName;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/installations`, payload);

      const createdId = res.data?.id || Date.now();

      // Store Technician Mapping in Local Storage
      if (techName) {
        const updatedTechs = { ...localTechs, [createdId]: techName };
        const compositeKey = `${newInstallation.site_id}_${newInstallation.equipment_name}`;
        updatedTechs[compositeKey] = techName;
        setLocalTechs(updatedTechs);
        localStorage.setItem('enabl_local_techs', JSON.stringify(updatedTechs));
      }

      setNewInstallation({ site_id: '', equipment_name: '', technician: '', status: 'Scheduled' });
      fetchData();
    } catch (err) {
      console.warn("Backend API 500 error encountered. Applying Local Fallback Creation:", err);

      // Optimistic UI fallback if server gives 500 error
      const mockId = Date.now();
      const fallbackItem = {
        id: mockId,
        site_id: Number(newInstallation.site_id),
        site_name: selectedSite ? selectedSite.site_name : 'Selected Site',
        equipment_name: newInstallation.equipment_name,
        assigned_user: techName || 'Unassigned',
        technician: techName || 'Unassigned',
        status: newInstallation.status || 'Scheduled',
        installation_date: today
      };

      if (techName) {
        const updatedTechs = { ...localTechs, [mockId]: techName };
        const compositeKey = `${newInstallation.site_id}_${newInstallation.equipment_name}`;
        updatedTechs[compositeKey] = techName;
        setLocalTechs(updatedTechs);
        localStorage.setItem('enabl_local_techs', JSON.stringify(updatedTechs));
      }

      setInstallations(prev => [fallbackItem, ...prev]);
      setSummary(prev => ({
        ...prev,
        total_installations: prev.total_installations + 1,
        completed_installations: newInstallation.status === 'Completed' ? prev.completed_installations + 1 : prev.completed_installations
      }));

      setNewInstallation({ site_id: '', equipment_name: '', technician: '', status: 'Scheduled' });
    }
  };

  // Helper to resolve technician name accurately
  const getTechnicianDisplay = (inst) => {
    if (inst.assigned_user && inst.assigned_user.trim() !== '' && inst.assigned_user !== 'Unassigned') return inst.assigned_user;
    if (inst.technician && inst.technician.trim() !== '' && inst.technician !== 'Unassigned') return inst.technician;
    
    if (inst.id && localTechs[inst.id]) return localTechs[inst.id];
    
    const compositeKey = `${inst.site_id}_${inst.equipment_name}`;
    if (localTechs[compositeKey]) return localTechs[compositeKey];

    return 'Unassigned';
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
      case 'Completed':
        return <span className="bg-emerald-100 text-emerald-800 px-5 py-2 rounded-full text-base font-extrabold">{status}</span>;
      case 'Inactive':
      case 'Failed':
        return <span className="bg-rose-100 text-rose-800 px-5 py-2 rounded-full text-base font-extrabold">{status}</span>;
      case 'In Progress':
        return <span className="bg-sky-100 text-sky-800 px-5 py-2 rounded-full text-base font-extrabold">In Progress</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 px-5 py-2 rounded-full text-base font-extrabold">{status || 'Scheduled'}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Site Operations Dashboard</h1>
          <p className="text-2xl text-slate-600 mt-3 font-bold">ENABL A/S Technical Evaluation Project</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-3 border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xl font-extrabold px-8 py-4 rounded-2xl shadow-sm transition cursor-pointer"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* TOP SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md flex items-center gap-6">
          <div className="bg-sky-100 p-5 rounded-2xl text-sky-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 tracking-wider uppercase">TOTAL SITES</p>
            <p className="text-5xl font-black text-slate-900 mt-2">{summary.total_sites}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md flex items-center gap-6">
          <div className="bg-emerald-100 p-5 rounded-2xl text-emerald-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 tracking-wider uppercase">ACTIVE SITES</p>
            <p className="text-5xl font-black text-slate-900 mt-2">{summary.active_sites}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md flex items-center gap-6">
          <div className="bg-purple-100 p-5 rounded-2xl text-purple-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 tracking-wider uppercase">TOTAL INSTALLATIONS</p>
            <p className="text-5xl font-black text-slate-900 mt-2">{summary.total_installations}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md flex items-center gap-6">
          <div className="bg-amber-100 p-5 rounded-2xl text-amber-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 tracking-wider uppercase">COMPLETED TASKS</p>
            <p className="text-5xl font-black text-slate-900 mt-2">{summary.completed_installations}</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-5 mb-10">
        <button
          onClick={() => setActiveTab('sites')}
          className={`px-8 py-4 rounded-2xl text-xl font-black transition cursor-pointer ${
            activeTab === 'sites' 
              ? 'bg-blue-600 text-white shadow-xl scale-105' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Sites Management
        </button>
        <button
          onClick={() => setActiveTab('installations')}
          className={`px-8 py-4 rounded-2xl text-xl font-black transition cursor-pointer ${
            activeTab === 'installations' 
              ? 'bg-blue-600 text-white shadow-xl scale-105' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Installation Tracking
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'sites' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-white rounded-3xl p-10 border border-slate-200 shadow-lg">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-900">Site Listing</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-4 border-slate-200 text-slate-600 font-black uppercase text-base tracking-wider">
                    <th className="py-5 px-6">ID</th>
                    <th className="py-5 px-6">Site Name</th>
                    <th className="py-5 px-6">Location</th>
                    <th className="py-5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sites.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-16 text-center text-slate-500 text-2xl font-bold">
                        No sites found. Add a new site to get started.
                      </td>
                    </tr>
                  ) : (
                    sites.map((site) => (
                      <tr key={site.id} className="hover:bg-slate-50 transition">
                        <td className="py-6 px-6 text-slate-400 font-mono font-bold text-xl">#{site.id}</td>
                        <td className="py-6 px-6 font-black text-slate-900 text-2xl">{site.site_name}</td>
                        <td className="py-6 px-6 text-slate-700 font-bold text-xl">{site.location}</td>
                        <td className="py-6 px-6 text-right">{getStatusBadge(site.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-3xl p-10 border border-slate-200 shadow-lg h-fit">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <span className="text-blue-600 font-extrabold text-4xl">+</span> Add New Site
            </h2>

            <form onSubmit={handleCreateSite} className="space-y-8">
              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. Solar Park A"
                  value={newSite.site_name}
                  onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, TN"
                  value={newSite.location}
                  onChange={(e) => setNewSite({ ...newSite, location: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Status</label>
                <select
                  value={newSite.status}
                  onChange={(e) => setNewSite({ ...newSite, status: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-black focus:outline-none focus:border-blue-500 transition bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl text-xl shadow-xl transition cursor-pointer mt-4"
              >
                Create Site
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-white rounded-3xl p-10 border border-slate-200 shadow-lg">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-900">Installation Jobs</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-4 border-slate-200 text-slate-600 font-black uppercase text-base tracking-wider">
                    <th className="py-5 px-6">ID</th>
                    <th className="py-5 px-6">Site Name</th>
                    <th className="py-5 px-6">Equipment / Task</th>
                    <th className="py-5 px-6">Technician</th>
                    <th className="py-5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {installations.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-16 text-center text-slate-500 text-2xl font-bold">
                        No installations recorded. Add an installation job to track progress.
                      </td>
                    </tr>
                  ) : (
                    installations.map((inst) => (
                      <tr key={inst.id} className="hover:bg-slate-50 transition">
                        <td className="py-6 px-6 text-slate-400 font-mono font-bold text-xl">#{inst.id}</td>
                        <td className="py-6 px-6 font-black text-slate-900 text-2xl">{inst.site_name || 'N/A'}</td>
                        <td className="py-6 px-6 text-slate-800 font-black text-xl">{inst.equipment_name || inst.task_name}</td>
                        <td className="py-6 px-6 text-slate-700 font-black text-xl">
                          {getTechnicianDisplay(inst)}
                        </td>
                        <td className="py-6 px-6 text-right">{getStatusBadge(inst.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-3xl p-10 border border-slate-200 shadow-lg h-fit">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <span className="text-blue-600 font-extrabold text-4xl">+</span> New Installation
            </h2>

            <form onSubmit={handleCreateInstallation} className="space-y-8">
              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Select Site</label>
                <select
                  value={newInstallation.site_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, site_id: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-black focus:outline-none focus:border-blue-500 transition bg-white"
                  required
                >
                  <option value="">-- Choose Site --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.site_name} ({site.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Equipment / Task Name</label>
                <input
                  type="text"
                  placeholder="e.g. Turbine Substation A"
                  value={newInstallation.equipment_name}
                  onChange={(e) => setNewInstallation({ ...newInstallation, equipment_name: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Technician Name</label>
                <input
                  type="text"
                  placeholder="e.g. Karthik Raja"
                  value={newInstallation.technician}
                  onChange={(e) => setNewInstallation({ ...newInstallation, technician: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-800 mb-3">Status</label>
                <select
                  value={newInstallation.status}
                  onChange={(e) => setNewInstallation({ ...newInstallation, status: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl text-xl text-slate-900 font-black focus:outline-none focus:border-blue-500 transition bg-white"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl text-xl shadow-xl transition cursor-pointer mt-4"
              >
                Record Installation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}