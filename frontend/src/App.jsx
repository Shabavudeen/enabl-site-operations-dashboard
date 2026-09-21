import React, { useState, useEffect } from 'react';
import './App.css';

// Render-ல் நாம் deploy செய்த Live Backend URL
const API_BASE_URL = 'https://enabl-backend.onrender.com';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState({
    total_sites: 0,
    active_sites: 0,
    total_installations: 0,
    completed_installations: 0,
  });
  const [sites, setSites] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [users, setUsers] = useState([]);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // New Site Form states
  const [newSite, setNewSite] = useState({ site_name: '', location: '', status: 'Active' });
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch Summary, Sites, Installations & Users on Load
  useEffect(() => {
    fetchSummary();
    fetchSites();
    fetchInstallations();
    fetchUsers();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const fetchSites = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sites`);
      const data = await res.json();
      setSites(data);
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  const fetchInstallations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/installations`);
      const data = await res.json();
      setInstallations(data);
    } catch (err) {
      console.error('Error fetching installations:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Handle Add New Site
  const handleAddSite = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      if (res.ok) {
        setSuccessMessage('Site added successfully!');
        setNewSite({ site_name: '', location: '', status: 'Active' });
        fetchSites();
        fetchSummary();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error adding site:', err);
    }
  };

  // Filtered Sites
  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2>ENABL Operations</h2>
        <ul>
          <li
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard Metrics
          </li>
          <li
            className={activeTab === 'sites' ? 'active' : ''}
            onClick={() => setActiveTab('sites')}
          >
            ⚡ Sites Management
          </li>
          <li
            className={activeTab === 'installations' ? 'active' : ''}
            onClick={() => setActiveTab('installations')}
          >
            🛠️ Installations Tracking
          </li>
        </ul>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-bar">
          <h1>Site Operations Dashboard</h1>
          <span className="live-badge">🟢 Connected to Render Live API</span>
        </header>

        {/* TAB 1: DASHBOARD METRICS */}
        {activeTab === 'dashboard' && (
          <div className="tab-section">
            <h2>Operational Overview</h2>
            <div className="metrics-grid">
              <div className="card">
                <h3>Total Sites</h3>
                <p className="metric-value">{summary.total_sites}</p>
              </div>
              <div className="card">
                <h3>Active Sites</h3>
                <p className="metric-value">{summary.active_sites}</p>
              </div>
              <div className="card">
                <h3>Total Installations</h3>
                <p className="metric-value">{summary.total_installations}</p>
              </div>
              <div className="card">
                <h3>Completed Tasks</h3>
                <p className="metric-value">{summary.completed_installations}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SITES MANAGEMENT */}
        {activeTab === 'sites' && (
          <div className="tab-section">
            <h2>Sites Management</h2>

            {/* Add New Site Form */}
            <form onSubmit={handleAddSite} className="site-form">
              <h3>Add New Site</h3>
              {successMessage && <p className="success-msg">{successMessage}</p>}
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Site Name"
                  value={newSite.site_name}
                  onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newSite.location}
                  onChange={(e) => setNewSite({ ...newSite, location: e.target.value })}
                  required
                />
                <select
                  value={newSite.status}
                  onChange={(e) => setNewSite({ ...newSite, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
                <button type="submit">Add Site</button>
              </div>
            </form>

            {/* Search & Filters */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Sites Table */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Site Name</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.length > 0 ? (
                  filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td>{site.id}</td>
                      <td>{site.site_name}</td>
                      <td>{site.location}</td>
                      <td>
                        <span className={`status-badge ${site.status.toLowerCase()}`}>
                          {site.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No sites found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: INSTALLATIONS TRACKING */}
        {activeTab === 'installations' && (
          <div className="tab-section">
            <h2>Installations Tracking</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Equipment</th>
                  <th>Site Name</th>
                  <th>Assigned User</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
            <tbody>
                {installations.length > 0 ? (
                  installations.map((inst) => (
                    <tr key={inst.id}>
                      <td>{inst.id}</td>
                      <td>{inst.equipment_name}</td>
                      <td>{inst.site_name || 'N/A'}</td>
                      <td>{inst.assigned_user || 'Unassigned'}</td>
                      <td>
                        <span className={`status-badge ${inst.status?.toLowerCase()}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td>{new Date(inst.installation_date).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>No installations tracked yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;