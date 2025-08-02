at Runway they changed the const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Simple database setup
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database ready');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LetsChat Online' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get characters
app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM characters ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Upload character - accepts ANY JSON format
app.post('/api/characters', async (req, res) => {
  try {
    const characterData = req.body;
    
    if (!characterData.name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO characters (name, data) VALUES ($1, $2) RETURNING *
    `, [characterData.name, JSON.stringify(characterData)]);

    res.json({
      success: true,
      message: `Successfully uploaded ${characterData.name}!`,
      character: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading character:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload character',
      details: error.message
    });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});health industry a few different times with some of the updates over the years and this week was no exception