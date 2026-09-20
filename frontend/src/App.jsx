import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Wrench, CheckCircle2, Clock, Plus, Search, RefreshCw } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [summary, setSummary] = useState({
    total_sites: 0,
    active_sites: 0,
    total_installations: 0,
    completed_installations: 0,
  });
  const [sites, setSites] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [users, setUsers] = useState([]);

  const [activeTab, setActiveTab] = useState('sites');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [newSite, setNewSite] = useState({ site_name: '', location: '', status: 'Pending' });
  const [newInstallation, setNewInstallation] = useState({
    site_id: '',
    assigned_user_id: '',
    equipment_name: '',
    status: 'Scheduled',
    installation_date: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [summaryRes, sitesRes, installationsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/summary`),
        axios.get(`${API_BASE_URL}/sites`),
        axios.get(`${API_BASE_URL}/installations`),
        axios.get(`${API_BASE_URL}/users`),
      ]);
      setSummary(summaryRes.data);
      setSites(sitesRes.data);
      setInstallations(installationsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/sites`, newSite);
      setNewSite({ site_name: '', location: '', status: 'Pending' });
      fetchAllData();
    } catch (error) {
      console.error('Error adding site:', error);
    }
  };

  const handleAddInstallation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/installations`, newInstallation);
      setNewInstallation({
        site_id: '',
        assigned_user_id: '',
        equipment_name: '',
        status: 'Scheduled',
        installation_date: '',
      });
      fetchAllData();
    } catch (error) {
      console.error('Error adding installation:', error);
    }
  };

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInstallations = installations.filter((inst) => {
    const matchesSearch =
      inst.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.site_name && inst.site_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || inst.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Site Operations Dashboard</h1>
          <p>ENABL A/S Technical Evaluation Project</p>
        </div>
        <button className="btn-refresh" onClick={fetchAllData}>
          <RefreshCw size={16} /> Refresh Data
        </button>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="card summary-card">
          <div className="card-icon bg-blue"><Building2 size={24} /></div>
          <div>
            <h3>Total Sites</h3>
            <p className="card-value">{summary.total_sites}</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon bg-green"><CheckCircle2 size={24} /></div>
          <div>
            <h3>Active Sites</h3>
            <p className="card-value">{summary.active_sites}</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon bg-purple"><Wrench size={24} /></div>
          <div>
            <h3>Total Installations</h3>
            <p className="card-value">{summary.total_installations}</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon bg-orange"><Clock size={24} /></div>
          <div>
            <h3>Completed Tasks</h3>
            <p className="card-value">{summary.completed_installations}</p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'sites' ? 'active' : ''}`}
            onClick={() => { setActiveTab('sites'); setStatusFilter('All'); }}
          >
            Sites Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'installations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('installations'); setStatusFilter('All'); }}
          >
            Installation Tracking
          </button>
        </div>

        <div className="search-filter-group">
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {activeTab === 'sites' ? (
              <>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </>
            ) : (
              <>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="content-grid">
        <div className="table-section card">
          {activeTab === 'sites' ? (
            <>
              <h2>Sites Listing</h2>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Site Name</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td>#{site.id}</td>
                      <td><strong>{site.site_name}</strong></td>
                      <td>{site.location}</td>
                      <td><span className={`status-badge status-${site.status.toLowerCase().replace(' ', '-')}`}>{site.status}</span></td>
                    </tr>
                  ))}
                  {filteredSites.length === 0 && (
                    <tr><td colSpan="4" className="empty-text">No sites found.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <h2>Installation Records</h2>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Equipment</th>
                    <th>Site</th>
                    <th>Assigned To</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstallations.map((inst) => (
                    <tr key={inst.id}>
                      <td>#{inst.id}</td>
                      <td><strong>{inst.equipment_name}</strong></td>
                      <td>{inst.site_name || 'N/A'}</td>
                      <td>{inst.assigned_user || 'Unassigned'}</td>
                      <td>{new Date(inst.installation_date).toLocaleDateString()}</td>
                      <td><span className={`status-badge status-${inst.status.toLowerCase().replace(' ', '-')}`}>{inst.status}</span></td>
                    </tr>
                  ))}
                  {filteredInstallations.length === 0 && (
                    <tr><td colSpan="6" className="empty-text">No installations found.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="form-section card">
          {activeTab === 'sites' ? (
            <>
              <h2><Plus size={18} /> Add New Site</h2>
              <form onSubmit={handleAddSite}>
                <div className="form-group">
                  <label>Site Name</label>
                  <input
                    type="text"
                    required
                    value={newSite.site_name}
                    onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                    placeholder="e.g. Solar Park A"
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    required
                    value={newSite.location}
                    onChange={(e) => setNewSite({ ...newSite, location: e.target.value })}
                    placeholder="e.g. Chennai, TN"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newSite.status}
                    onChange={(e) => setNewSite({ ...newSite, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Create Site</button>
              </form>
            </>
          ) : (
            <>
              <h2><Plus size={18} /> Add Installation</h2>
              <form onSubmit={handleAddInstallation}>
                <div className="form-group">
                  <label>Site</label>
                  <select
                    required
                    value={newInstallation.site_id}
                    onChange={(e) => setNewInstallation({ ...newInstallation, site_id: e.target.value })}
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.site_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned User</label>
                  <select
                    value={newInstallation.assigned_user_id}
                    onChange={(e) => setNewInstallation({ ...newInstallation, assigned_user_id: e.target.value })}
                  >
                    <option value="">Select User</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Equipment Name</label>
                  <input
                    type="text"
                    required
                    value={newInstallation.equipment_name}
                    onChange={(e) => setNewInstallation({ ...newInstallation, equipment_name: e.target.value })}
                    placeholder="e.g. Inverter 50KW"
                  />
                </div>
                <div className="form-group">
                  <label>Installation Date</label>
                  <input
                    type="date"
                    required
                    value={newInstallation.installation_date}
                    onChange={(e) => setNewInstallation({ ...newInstallation, installation_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newInstallation.status}
                    onChange={(e) => setNewInstallation({ ...newInstallation, status: e.target.value })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Record Installation</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;