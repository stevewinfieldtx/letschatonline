const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

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
        name VARCHAR(255) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        character_name VARCHAR(255) NOT NULL,
        memory JSONB DEFAULT '{}',
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES user_sessions(id),
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Convert detailed character format to chat format
function convertCharacterFormat(characterData) {
  if (characterData.prompt || characterData.systemPrompt) {
    return characterData;
  }

  const interests = characterData.personality_traits?.interests || ["Music", "Art", "Fashion"];
  const coreTraits = characterData.personality_traits?.core_traits || [];
  const guidelines = characterData.ai_instructions?.conversation_guidelines || [];
  const greeting = characterData.chat_behavior?.typical_responses?.greeting || "Hello there!";
  const signaturePhrases = characterData.voice_profile?.signature_phrases || [];

  const systemPrompt = `You are ${characterData.name}, a ${characterData.personality_traits?.profession || 'creative professional'}.

PERSONALITY: ${characterData.bible_personality?.description || 'Creative and confident personality'}
Core traits: ${coreTraits.join(', ')}
Communication style: ${characterData.personality_traits?.communication_style || 'warm and expressive'}

VOICE: ${characterData.voice_profile?.tone || 'warm and friendly'}
Signature phrases: "${signaturePhrases.join('", "')}"

INTERESTS: ${interests.join(', ')}
GUIDELINES: ${guidelines.join(', ')}

Greeting: "${greeting}"
Keep responses engaging and authentic to your personality.`;

  return {
    name: characterData.name,
    age: 24,
    occupation: characterData.personality_traits?.profession || "Creative Professional",
    location: "Miami, FL",
    description: characterData.bible_personality?.description || "Creative and confident personality",
    avatar: getAvatarForProfession(characterData.personality_traits?.profession),
    profileImages: generateProfileImages(characterData.ethnicity),
    interests: interests,
    personality: characterData.bible_personality?.primary_type || "Creative and confident",
    lookingFor: "Someone who appreciates creativity and authenticity",
    systemPrompt: systemPrompt,
    originalData: characterData
  };
}

function getAvatarForProfession(profession) {
  const professionMap = {
    'Music Producer': '🎵',
    'DJ': '🎧',
    'Artist': '🎨',
    'Photographer': '📸',
    'Chef': '👩‍🍳',
    'Yoga Instructor': '🧘',
    'Software Engineer': '💻',
    'Travel Blogger': '✈️'
  };
  return professionMap[profession] || '💕';
}

function generateProfileImages(ethnicity) {
  const imagesByEthnicity = {
    'light_black': [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop&crop=face"
    ],
    'caucasian': [
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face"
    ]
  };
  return imagesByEthnicity[ethnicity] || imagesByEthnicity['caucasian'];
}

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'LetsChat Online'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, data FROM characters ORDER BY name');
    // FIX: Don't parse - data is already an object from JSONB
    const characters = result.rows.map(row => row.data);
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

app.get('/api/characters/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM characters WHERE name = $1', [req.params.name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(JSON.parse(result.rows[0].data));
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

app.post('/api/characters', async (req, res) => {
  try {
    const rawCharacterData = req.body;
    
    if (!rawCharacterData.name) {
      return res.status(400).json({ error: 'Character name is required' });
    }

    const characterData = convertCharacterFormat(rawCharacterData);
    
    await pool.query(
      `INSERT INTO characters (name, data) VALUES ($1, $2) 
       ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
      [characterData.name, JSON.stringify(characterData)]
    );

    res.json({ 
      message: 'Character uploaded successfully', 
      character: characterData 
    });
  } catch (error) {
    console.error('Error uploading character:', error);
    res.status(500).json({ error: 'Failed to upload character' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { characterName, message, userId = 'anonymous' } = req.body;

    const charResult = await pool.query('SELECT data FROM characters WHERE name = $1', [characterName]);
    if (charResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = JSON.parse(charResult.rows[0].data);

    let sessionResult = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND character_name = $2 ORDER BY last_active DESC LIMIT 1',
      [userId, characterName]
    );

    let sessionId;
    let memory = {};

    if (sessionResult.rows.length === 0) {
      const newSession = await pool.query(
        'INSERT INTO user_sessions (user_id, character_name, memory) VALUES ($1, $2, $3) RETURNING id',
        [userId, characterName, JSON.stringify({})]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
      memory = sessionResult.rows[0].memory || {};
      
      await pool.query(
        'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    }

    const historyResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT 8',
      [sessionId]
    );
    
    const chatHistory = historyResult.rows.reverse();

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );

    const memoryContext = Object.keys(memory).length > 0 
      ? `\n\nWhat you remember: ${JSON.stringify(memory, null, 2)}`
      : '';

    if (!process.env.OPENROUTER_API_KEY) {
      const reply = `Hello! I'm ${character.name}. Thanks for your message: "${message}". I'd love to chat more once the OpenRouter API key is configured!`;
      
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', reply]
      );

      return res.json({ reply, sessionId, memory });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: character.model || 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: character.systemPrompt + memoryContext },
          ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'assistant', reply]
    );

    const updatedMemory = { ...memory };
    if (message.toLowerCase().includes('my name is') || message.toLowerCase().includes('i am')) {
      const nameMatch = message.match(/(?:my name is|i am|i'm)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        updatedMemory.userName = nameMatch[1];
      }
    }

    await pool.query(
      'UPDATE user_sessions SET memory = $1 WHERE id = $2',
      [JSON.stringify(updatedMemory), sessionId]
    );

    res.json({ 
      reply,
      sessionId,
      memory: updatedMemory
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  console.log(`🌐 Live at: https://letschatonline.onrender.com`);
  await initDB();
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});