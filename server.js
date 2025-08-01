const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize database tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        character_key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        character_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_memory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        character_key VARCHAR(50) NOT NULL,
        session_data JSONB NOT NULL,
        session_date DATE DEFAULT CURRENT_DATE,
        tokens INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, character_key, session_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        tokens INTEGER DEFAULT 50,
        last_purchase TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Character Management Routes
app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT character_key, name, character_data FROM characters WHERE is_active = true ORDER BY created_at DESC'
    );
    
    const characters = {};
    result.rows.forEach(row => {
      characters[row.character_key] = row.character_data;
    });

    // Add fallback support character if no characters exist
    if (Object.keys(characters).length === 0) {
      characters.support = {
        name: "Support",
        age: 25,
        occupation: "Platform Assistant",
        location: "ChatCharacters HQ",
        description: "Friendly assistant helping you connect",
        avatar: "💬",
        profileImages: [
          "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=600&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop&crop=face",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face"
        ],
        interests: ["Helping Others", "Technology", "Conversations"],
        personality: "Helpful and understanding",
        lookingFor: "Ways to help you have a great experience",
        prompt: "You are a friendly support assistant for ChatCharacters platform. Be helpful, professional, and engaging."
      };
    }

    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Admin Routes
app.get('/api/admin/characters', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM characters ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

app.post('/api/admin/characters', async (req, res) => {
  try {
    const { character_key, name, character_data } = req.body;
    
    const result = await pool.query(
      `INSERT INTO characters (character_key, name, character_data) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (character_key) 
       DO UPDATE SET name = $2, character_data = $3, updated_at = NOW()
       RETURNING *`,
      [character_key, name, character_data]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving character:', error);
    res.status(500).json({ error: 'Failed to save character' });
  }
});

app.put('/api/admin/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { character_key, name, character_data, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE characters 
       SET character_key = $1, name = $2, character_data = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [character_key, name, character_data, is_active, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

app.delete('/api/admin/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM characters WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// Memory Management Routes
app.get('/api/memory/:userId/:characterKey', async (req, res) => {
  try {
    const { userId, characterKey } = req.params;
    
    const result = await pool.query(
      `SELECT session_data, session_date, tokens 
       FROM user_memory 
       WHERE user_id = $1 AND character_key = $2 
       ORDER BY session_date DESC 
       LIMIT 10`,
      [userId, characterKey]
    );
    
    // Apply memory decay based on age
    const sessions = result.rows.map(row => {
      const sessionAge = Math.floor((Date.now() - new Date(row.session_date)) / (1000 * 60 * 60 * 24));
      let tokens = row.tokens;
      
      // Memory decay logic
      if (sessionAge >= 94) {
        return null; // Delete after 94 days
      } else if (sessionAge >= 56) {
        tokens = Math.min(tokens, 250); // Session 4: max 250 tokens
      } else if (sessionAge >= 28) {
        tokens = Math.min(tokens, 500); // Session 3: max 500 tokens
      } else if (sessionAge >= 14) {
        tokens = Math.min(tokens, 750); // Session 2: max 750 tokens
      }
      
      return {
        ...row.session_data,
        session_date: row.session_date,
        tokens,
        age_days: sessionAge
      };
    }).filter(session => session !== null);
    
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

app.post('/api/memory/:userId/:characterKey', async (req, res) => {
  try {
    const { userId, characterKey } = req.params;
    const { session_data } = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_memory (user_id, character_key, session_data, tokens)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, character_key, session_date)
       DO UPDATE SET session_data = $3, tokens = $4, updated_at = NOW()
       RETURNING *`,
      [userId, characterKey, session_data, session_data.summary?.length || 0]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

// Token Management Routes
app.get('/api/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let result = await pool.query(
      'SELECT tokens FROM user_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create new user with starting tokens
      await pool.query(
        'INSERT INTO user_tokens (user_id, tokens) VALUES ($1, 50)',
        [userId]
      );
      result = await pool.query(
        'SELECT tokens FROM user_tokens WHERE user_id = $1',
        [userId]
      );
    }
    
    res.json({ tokens: result.rows[0].tokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

app.post('/api/tokens/:userId/spend', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    const result = await pool.query(
      `UPDATE user_tokens 
       SET tokens = GREATEST(0, tokens - $2), updated_at = NOW()
       WHERE user_id = $1 
       RETURNING tokens`,
      [userId, amount]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ tokens: result.rows[0].tokens });
  } catch (error) {
    console.error('Error spending tokens:', error);
    res.status(500).json({ error: 'Failed to spend tokens' });
  }
});

app.post('/api/tokens/:userId/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    const result = await pool.query(
      `UPDATE user_tokens 
       SET tokens = tokens + $2, updated_at = NOW()
       WHERE user_id = $1 
       RETURNING tokens`,
      [userId, amount]
    );
    
    if (result.rows.length === 0) {
      // Create new user if not exists
      await pool.query(
        'INSERT INTO user_tokens (user_id, tokens) VALUES ($1, $2)',
        [userId, amount]
      );
      return res.json({ tokens: amount });
    }
    
    res.json({ tokens: result.rows[0].tokens });
  } catch (error) {
    console.error('Error adding tokens:', error);
    res.status(500).json({ error: 'Failed to add tokens' });
  }
});

// Admin Panel Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initDB();
});

module.exports = app;