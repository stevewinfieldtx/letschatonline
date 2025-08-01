const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
  // Handle both old simple format and new detailed format
  if (characterData.prompt || characterData.systemPrompt) {
    // Already in simple format
    return characterData;
  }

  // Convert detailed format to chat format
  const interests = characterData.personality_traits?.interests || ["Music", "Art", "Fashion"];
  const coreTraits = characterData.personality_traits?.core_traits || [];
  const guidelines = characterData.ai_instructions?.conversation_guidelines || [];
  const greeting = characterData.chat_behavior?.typical_responses?.greeting || "Hello there!";
  const complimentResponse = characterData.chat_behavior?.typical_responses?.compliment_received || "Thank you!";
  const flirtyResponse = characterData.chat_behavior?.typical_responses?.flirty_message || "You're sweet!";
  const signaturePhrases = characterData.voice_profile?.signature_phrases || [];
  const passionateTopics = characterData.chat_behavior?.passionate_topics || [];

  // Build comprehensive system prompt
  const systemPrompt = `You are ${characterData.name}, a ${characterData.personality_traits?.profession || 'creative professional'}.

PERSONALITY CORE:
${characterData.bible_personality?.description || 'Creative and confident personality'}
Core traits: ${coreTraits.join(', ')}
Communication style: ${characterData.personality_traits?.communication_style || 'warm and expressive'}
Humor: ${characterData.personality_traits?.humor_type || 'playful'}

VOICE & SPEAKING STYLE:
Tone: ${characterData.voice_profile?.tone || 'warm and friendly'}
Pace: ${characterData.voice_profile?.pace || 'moderate'}
Voice characteristics: ${JSON.stringify(characterData.voice_profile?.voice_characteristics || {})}
Signature phrases: "${signaturePhrases.join('", "')}"

INTERESTS & PASSIONS:
Main interests: ${interests.join(', ')}
Gets passionate about: ${passionateTopics.join(', ')}
Values: ${characterData.personality_traits?.values?.join(', ') || 'authenticity, creativity'}

CONVERSATION BEHAVIOR:
Flirting style: ${characterData.chat_behavior?.flirting_style || 'warm and genuine'}
Emotional range: ${characterData.chat_behavior?.emotional_range || 'expressive and authentic'}
How you handle compliments: ${characterData.chat_behavior?.response_to_compliments || 'graciously'}

GUIDELINES:
${guidelines.join('\n')}

TYPICAL RESPONSES:
- Greeting: "${greeting}"
- When complimented: "${complimentResponse}" 
- Flirty response: "${flirtyResponse}"
- Goodbye: "${characterData.chat_behavior?.typical_responses?.goodbye || 'Take care!'}"

${characterData.ai_instructions?.personality_prompt || ''}

Keep responses engaging, authentic to your personality, and under 100 words unless diving deep into topics you're passionate about. Use your signature phrases naturally and maintain your unique voice and energy.`;

  return {
    name: characterData.name,
    age: 24, // Default age
    occupation: characterData.personality_traits?.profession || "Creative Professional",
    location: "Miami, FL", // Default location
    description: characterData.bible_personality?.description || "Creative and confident personality",
    avatar: getAvatarForProfession(characterData.personality_traits?.profession),
    profileImages: generateProfileImages(characterData.ethnicity),
    interests: interests,
    personality: characterData.bible_personality?.primary_type || "Creative and confident",
    lookingFor: "Someone who appreciates creativity and authenticity",
    systemPrompt: systemPrompt,
    // Store original detailed data
    originalData: characterData
  };
}

// Generate avatar emoji based on profession
function getAvatarForProfession(profession) {
  const professionMap = {
    'Music Producer': '🎵',
    'DJ': '🎧',
    'Artist': '🎨',
    'Photographer': '📸',
    'Chef': '👩‍🍳',
    'Yoga Instructor': '🧘',
    'Software Engineer': '💻',
    'Travel Blogger': '✈️',
    'Fashion Designer': '👗',
    'Writer': '✍️'
  };
  return professionMap[profession] || '💕';
}

// Generate profile images based on ethnicity and style
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
    ],
    'hispanic': [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=600&fit=crop&crop=face"
    ]
  };
  
  return imagesByEthnicity[ethnicity] || imagesByEthnicity['caucasian'];
}

// Load default characters
async function loadDefaultCharacters() {
  try {
    const charactersDir = path.join(__dirname, 'characters');
    const files = await fs.readdir(charactersDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const rawCharacterData = JSON.parse(
          await fs.readFile(path.join(charactersDir, file), 'utf8')
        );
        
        // Convert to chat format
        const characterData = convertCharacterFormat(rawCharacterData);
        
        await pool.query(
          `INSERT INTO characters (name, data) VALUES ($1, $2) 
           ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
          [characterData.name, JSON.stringify(characterData)]
        );
      }
    }
    console.log('✅ Default characters loaded and converted');
  } catch (error) {
    console.error('❌ Error loading characters:', error);
  }
}

// Routes

// Get all characters
app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, data FROM characters ORDER BY name');
    const characters = result.rows.map(row => JSON.parse(row.data));
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Get specific character
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

// Upload new character (supports detailed format)
app.post('/api/characters', async (req, res) => {
  try {
    const rawCharacterData = req.body;
    
    if (!rawCharacterData.name) {
      return res.status(400).json({ error: 'Character name is required' });
    }

    // Convert to chat format
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

// Get character's Big Five personality data
app.get('/api/characters/:name/personality', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM characters WHERE name = $1', [req.params.name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = JSON.parse(result.rows[0].data);
    const originalData = character.originalData;
    
    if (originalData && originalData.bible_personality) {
      res.json({
        name: character.name,
        bigFive: originalData.bible_personality.big_five,
        primaryType: originalData.bible_personality.primary_type,
        voiceProfile: originalData.voice_profile,
        chatBehavior: originalData.chat_behavior
      });
    } else {
      res.json({ message: 'No detailed personality data available' });
    }
  } catch (error) {
    console.error('Error fetching personality:', error);
    res.status(500).json({ error: 'Failed to fetch personality data' });
  }
});

// Enhanced chat with personality-aware responses
app.post('/api/chat', async (req, res) => {
  try {
    const { characterName, message, userId = 'anonymous' } = req.body;

    // Get character data
    const charResult = await pool.query('SELECT data FROM characters WHERE name = $1', [characterName]);
    if (charResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = JSON.parse(charResult.rows[0].data);

    // Get or create user session
    let sessionResult = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND character_name = $2 ORDER BY last_active DESC LIMIT 1',
      [userId, characterName]
    );

    let sessionId;
    let memory = {};

    if (sessionResult.rows.length === 0) {
      // Create new session
      const newSession = await pool.query(
        'INSERT INTO user_sessions (user_id, character_name, memory) VALUES ($1, $2, $3) RETURNING id',
        [userId, characterName, JSON.stringify({})]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
      memory = sessionResult.rows[0].memory || {};
      
      // Update last active
      await pool.query(
        'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    }

    // Get recent chat history
    const historyResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT 8',
      [sessionId]
    );
    
    const chatHistory = historyResult.rows.reverse();

    // Save user message
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );

    // Build conversation context with personality
    const memoryContext = Object.keys(memory).length > 0 
      ? `\n\nWhat you remember about this person: ${JSON.stringify(memory, null, 2)}`
      : '';

    // Add personality context if available
    const originalData = character.originalData;
    let personalityContext = '';
    if (originalData) {
      personalityContext = `

PERSONALITY REMINDER - You are currently:
Big Five: Openness ${originalData.bible_personality?.big_five?.openness}/100, Extraversion ${originalData.bible_personality?.big_five?.extraversion}/100
Voice: ${originalData.voice_profile?.tone}, ${originalData.voice_profile?.pace}
Signature phrases: "${originalData.voice_profile?.signature_phrases?.join('", "') || ''}"
Flirting style: ${originalData.chat_behavior?.flirting_style}`;
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: character.model || 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: character.systemPrompt + memoryContext + personalityContext },
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

    // Save assistant message
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'assistant', reply]
    );

    // Enhanced memory extraction
    const updatedMemory = { ...memory };
    
    // Extract name
    if (message.toLowerCase().includes('my name is') || message.toLowerCase().includes('i am') || message.toLowerCase().includes("i'm")) {
      const nameMatch = message.match(/(?:my name is|i am|i'm)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        updatedMemory.userName = nameMatch[1];
      }
    }
    
    // Extract interests mentioned
    const interestKeywords = ['love', 'enjoy', 'passionate about', 'interested in', 'hobby'];
    for (const keyword of interestKeywords) {
      if (message.toLowerCase().includes(keyword)) {
        if (!updatedMemory.interests) updatedMemory.interests = [];
        // Simple extraction - could be enhanced with NLP
        const words = message.toLowerCase().split(' ');
        const keywordIndex = words.findIndex(word => word.includes(keyword.split(' ')[0]));
        if (keywordIndex !== -1 && keywordIndex < words.length - 1) {
          const potentialInterest = words.slice(keywordIndex + 1, keywordIndex + 3).join(' ');
          if (!updatedMemory.interests.includes(potentialInterest)) {
            updatedMemory.interests.push(potentialInterest);
          }
        }
      }
    }

    // Track conversation themes
    if (!updatedMemory.conversationCount) updatedMemory.conversationCount = 0;
    updatedMemory.conversationCount++;
    updatedMemory.lastMessage = new Date().toISOString();

    await pool.query(
      'UPDATE user_sessions SET memory = $1 WHERE id = $2',
      [JSON.stringify(updatedMemory), sessionId]
    );

    res.json({ 
      reply,
      sessionId,
      memory: updatedMemory,
      personalityActive: !!originalData
    });

  } catch (error) {.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = JSON.parse(charResult.rows[0].data);

    // Get or create user session
    let sessionResult = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND character_name = $2 ORDER BY last_active DESC LIMIT 1',
      [userId, characterName]
    );

    let sessionId;
    let memory = {};

    if (sessionResult.rows.length === 0) {
      // Create new session
      const newSession = await pool.query(
        'INSERT INTO user_sessions (user_id, character_name, memory) VALUES ($1, $2, $3) RETURNING id',
        [userId, characterName, JSON.stringify({})]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
      memory = sessionResult.rows[0].memory || {};
      
      // Update last active
      await pool.query(
        'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    }

    // Get recent chat history
    const historyResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [sessionId]
    );
    
    const chatHistory = historyResult.rows.reverse();

    // Save user message
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );

    // Build conversation context
    const memoryContext = Object.keys(memory).length > 0 
      ? `\n\nMemory from previous conversations: ${JSON.stringify(memory, null, 2)}`
      : '';

    const conversationHistory = chatHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}`
    ).join('\n');

    const fullPrompt = `${character.systemPrompt}${memoryContext}

Previous conversation:
${conversationHistory}

User: ${message}
${character.name}:`;

    // Call OpenRouter API
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

    // Save assistant message
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'assistant', reply]
    );

    // Update memory (simple keyword extraction for now)
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