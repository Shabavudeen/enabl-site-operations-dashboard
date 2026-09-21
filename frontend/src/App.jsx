import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://enabl-backend.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('sites');
  const [summary, setSummary] = useState({
    total_sites: 0,
    active_sites: 0,
    total_installations: 0,
    completed_installations: 0,
  });
  const [sites, setSites] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [siteFilter, setSiteFilter] = useState('All');
  const [installationFilter, setInstallationFilter] = useState('All');

  // Local Storage map for technician names
  const [localTechs, setLocalTechs] = useState(() => {
    const saved = localStorage.getItem('enabl_local_techs');
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch data
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
      console.warn("Backend API error fallback:", err);

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

  const getTechnicianDisplay = (inst) => {
    if (inst.assigned_user && inst.assigned_user.trim() !== '' && inst.assigned_user !== 'Unassigned') return inst.assigned_user;
    if (inst.technician && inst.technician.trim() !== '' && inst.technician !== 'Unassigned') return inst.technician;
    if (inst.id && localTechs[inst.id]) return localTechs[inst.id];
    const compositeKey = `${inst.site_id}_${inst.equipment_name}`;
    if (localTechs[compositeKey]) return localTechs[compositeKey];
    return 'Unassigned';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
      case 'Completed':
        return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">{status}</span>;
      case 'Inactive':
      case 'Failed':
        return <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-semibold">{status}</span>;
      case 'In Progress':
        return <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-xs font-semibold">In Progress</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">{status || 'Scheduled'}</span>;
    }
  };

  // Filtered lists
  const filteredSites = sites.filter((site) => {
    if (siteFilter === 'All') return true;
    return (site.status || '').toLowerCase() === siteFilter.toLowerCase();
  });

  const filteredInstallations = installations.filter((inst) => {
    if (installationFilter === 'All') return true;
    return (inst.status || 'Scheduled').toLowerCase() === installationFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-slate-50 w-full px-8 py-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Site Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">ENABL A/S Technical Evaluation Project</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
        >
          Refresh Data
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL SITES</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_sites}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
            🏢
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ACTIVE SITES</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.active_sites}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ✅
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL INSTALLATIONS</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_installations}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            ⚙️
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">COMPLETED TASKS</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.completed_installations}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            🕒
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('sites')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'sites' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Sites Management
        </button>
        <button
          onClick={() => setActiveTab('installations')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'installations' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Installation Tracking
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'sites' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SITES LIST */}
          <div className="lg:col-span-8 xl:col-span-9 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Sites Overview</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
                <select 
                  value={siteFilter} 
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Site Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSites.map((site) => (
                    <tr key={site.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">#{site.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{site.site_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{site.location}</td>
                      <td className="py-2.5 px-3">{getStatusBadge(site.status)}</td>
                    </tr>
                  ))}
                  {filteredSites.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400 text-xs">No sites found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE SITE FORM */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-fit">
            <h2 className="text-base font-bold text-slate-900 mb-4">+ Add New Site</h2>
            <form onSubmit={handleCreateSite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. Solar Park A"
                  value={newSite.site_name}
                  onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Aarhus, Denmark"
                  value={newSite.location}
                  onChange={(e) => setNewSite({ ...newSite, location: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={newSite.status}
                  onChange={(e) => setNewSite({ ...newSite, status: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
              >
                Create Site
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* INSTALLATIONS LIST */}
          <div className="lg:col-span-8 xl:col-span-9 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Installation Jobs</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
                <select 
                  value={installationFilter} 
                  onChange={(e) => setInstallationFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Site Name</th>
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInstallations.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{inst.equipment_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inst.site_name || `Site #${inst.site_id}`}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{getTechnicianDisplay(inst)}</td>
                      <td className="py-2.5 px-3">{getStatusBadge(inst.status)}</td>
                    </tr>
                  ))}
                  {filteredInstallations.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400 text-xs">No installation jobs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE INSTALLATION FORM */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-fit">
            <h2 className="text-base font-bold text-slate-900 mb-4">+ New Installation</h2>
            <form onSubmit={handleCreateInstallation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Site</label>
                <select
                  value={newInstallation.site_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, site_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Choose a Site --</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.site_name} ({s.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Turbine Sensor X-2"
                  value={newInstallation.equipment_name}
                  onChange={(e) => setNewInstallation({ ...newInstallation, equipment_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Technician</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newInstallation.technician}
                  onChange={(e) => setNewInstallation({ ...newInstallation, technician: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Status</label>
                <select
                  value={newInstallation.status}
                  onChange={(e) => setNewInstallation({ ...newInstallation, status: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
              >
                Schedule Installation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}