const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware for Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// FUNCTION TO CREATE TABLES AUTOMATICALLY ON STARTUP
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        site_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'Technician',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS installations (
        id SERIAL PRIMARY KEY,
        site_id INT REFERENCES sites(id) ON DELETE CASCADE,
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        equipment_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Scheduled',
        installation_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database tables created or verified successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

// 1. GET ALL SITES
app.get('/api/sites', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sites ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to fetch sites' });
  }
});

// 2. CREATE NEW SITE
app.post('/api/sites', async (req, res) => {
  const { site_name, location, status } = req.body;
  if (!site_name || !location) {
    return res.status(400).json({ error: 'site_name and location are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO sites (site_name, location, status) VALUES ($1, $2, $3) RETURNING *',
      [site_name, location, status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to create site' });
  }
});

// 3. GET ALL INSTALLATIONS (WITH SQL JOINS)
app.get('/api/installations', async (req, res) => {
  try {
    const query = `
      SELECT i.*, s.site_name, u.name as assigned_user
      FROM installations i
      LEFT JOIN sites s ON i.site_id = s.id
      LEFT JOIN users u ON i.assigned_user_id = u.id
      ORDER BY i.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to fetch installations' });
  }
});

// 4. CREATE NEW INSTALLATION
app.post('/api/installations', async (req, res) => {
  const { site_id, assigned_user_id, equipment_name, status, installation_date } = req.body;
  if (!site_id || !equipment_name || !installation_date) {
    return res.status(400).json({ error: 'site_id, equipment_name, and installation_date are required' });
  }
  try {
    const query = `
      INSERT INTO installations (site_id, assigned_user_id, equipment_name, status, installation_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [site_id, assigned_user_id, equipment_name, status || 'Scheduled', installation_date];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to create installation' });
  }
});

// 5. GET OPERATIONAL SUMMARY (AGGREGATED METRICS REQUIRED FOR EVALUATION)
app.get('/api/summary', async (req, res) => {
  try {
    const sitesCount = await pool.query('SELECT COUNT(*) FROM sites');
    const installationsCount = await pool.query('SELECT COUNT(*) FROM installations');
    const completedInstallations = await pool.query("SELECT COUNT(*) FROM installations WHERE status = 'Completed'");
    const activeSites = await pool.query("SELECT COUNT(*) FROM sites WHERE status = 'Active'");

    res.json({
      total_sites: parseInt(sitesCount.rows[0].count),
      active_sites: parseInt(activeSites.rows[0].count),
      total_installations: parseInt(installationsCount.rows[0].count),
      completed_installations: parseInt(completedInstallations.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to fetch summary metrics' });
  }
});

// 6. GET ALL USERS (FOR FRONTEND DROPDOWNS)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: Unable to fetch users' });
  }
});

// START SERVER AFTER INITIALIZING DB TABLES
const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});