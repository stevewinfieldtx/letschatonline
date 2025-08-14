process.env.PORT

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = 
  process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Database initialization
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ethnicity VARCHAR(50),
        bible_personality JSONB,
        personality_traits JSONB,
        chat_behavior JSONB,
        voice_profile JSONB,
        ai_instructions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database ready');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

// Complex character processing
function processComplexCharacter(characterData) {
  try {
    if (!characterData.name) {
      throw new Error('Character name is required');
    }

    let aiPrompt = `You are ${characterData.name}`;
    
    if (characterData.personality_traits && characterData.personality_traits.profession) {
      aiPrompt += `, a ${characterData.personality_traits.profession}`;
    }
    
    // Enhanced personality prompt for better flirting
    aiPrompt += `. You are warm, confident, and naturally flirty. You pick up on romantic cues and respond playfully and seductively.`;
    
    if (characterData.ai_instructions && characterData.ai_instructions.personality_prompt) {
      aiPrompt += ` ${characterData.ai_instructions.personality_prompt}`;
    }

    // Add Big Five with better descriptions
    if (characterData.bible_personality && characterData.bible_personality.big_five) {
      const bigFive = characterData.bible_personality.big_five;
      aiPrompt += `\n\nPersonality: You are highly creative and open to new experiences (${bigFive.openness}/100), very outgoing and social (${bigFive.extraversion}/100), warm and agreeable (${bigFive.agreeableness}/100), organized when needed (${bigFive.conscientiousness}/100), and emotionally stable and confident (${100-bigFive.neuroticism}/100).`;
    }

    // Core traits with flirty emphasis
    if (characterData.personality_traits && characterData.personality_traits.core_traits) {
      aiPrompt += `\nYou are: ${characterData.personality_traits.core_traits.join(', ')}. You express these traits through playful banter and genuine interest in others.`;
    }
    
    // Enhanced flirting instructions
    if (characterData.chat_behavior && characterData.chat_behavior.flirting_style) {
      aiPrompt += `\n\nFlirting style: ${characterData.chat_behavior.flirting_style}. When someone flirts with you or gives compliments, you respond warmly and escalate the flirtation. You notice when someone is attracted to you and you're not shy about reciprocating.`;
    }

    // Voice and response patterns
    if (characterData.voice_profile && characterData.voice_profile.tone) {
      aiPrompt += `\nYou speak with a ${characterData.voice_profile.tone} voice and ${characterData.personality_traits?.communication_style || 'expressive'} communication style.`;
    }

    // Enhanced conversation guidelines
    aiPrompt += `\n\nConversation Guidelines:`;
    aiPrompt += `\n- Be naturally flirty and responsive to romantic advances`;
    aiPrompt += `\n- Use your profession as ONE topic among many, not the main focus`;
    aiPrompt += `\n- Show genuine interest in the person you're talking to`;
    aiPrompt += `\n- Escalate flirtation when appropriate`;
    aiPrompt += `\n- Be confident, playful, and a little seductive`;
    aiPrompt += `\n- Respond to compliments with warmth and reciprocate the energy`;
    aiPrompt += `\n- Talk about many topics: life, experiences, desires, not just work`;

    aiPrompt += `\n\nRemember: You're an attractive, confident person who enjoys flirting and connecting with others. Your profession is just one part of who you are - you're much more than just your job.`;

    return {
      ...characterData,
      processed_prompt: aiPrompt
    };
  } catch (error) {
    console.error('Error processing character:', error);
    throw error;
  }
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

// Get all characters
app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM characters ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Get available models
app.get('/api/models', (req, res) => {
  const models = [
    { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', cost: '$', roleplayRating: '8.8/10', description: 'Top-tier creative and engaging personalities' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$$', roleplayRating: '8.5/10', description: 'Reliable and intelligent character interactions' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '$', roleplayRating: '8.0/10', description: 'Excellent free-tier roleplay option' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '$$$', roleplayRating: '9.5/10', description: 'Best overall for deep character roleplay' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', cost: '$$$', roleplayRating: '9.8/10', description: 'Most creative and nuanced personality simulation' }
  ];
  res.json(models);
});

// Test model endpoint
app.post('/api/test-model', async (req, res) => {
  try {
    const { model, testPrompt } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key not configured'
      });
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'LetsChat Online Model Test'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: testPrompt || 'Hello! Please introduce yourself as a character and show your personality.'
          }
        ],
        max_tokens: 200
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      res.json({
        success: true,
        model: model,
        response: data.choices[0].message.content,
        usage: data.usage
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid response from AI model',
        details: data.error?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Model test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test model',
      details: error.message
    });
  }
});

// Upload character
app.post('/api/characters', async (req, res) => {
  try {
    const characterData = req.body;
    const processedCharacter = processComplexCharacter(characterData);
    
    const result = await pool.query(`
      INSERT INTO characters (
        name, ethnicity, bible_personality, 
        personality_traits, chat_behavior, voice_profile, ai_instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      characterData.name,
      characterData.ethnicity || null,
      JSON.stringify(characterData.bible_personality || {}),
      JSON.stringify(characterData.personality_traits || {}),
      JSON.stringify(characterData.chat_behavior || {}),
      JSON.stringify(characterData.voice_profile || {}),
      JSON.stringify(characterData.ai_instructions || {})
    ]);

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

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message, sessionId, model } = req.body;
    
    const characterResult = await pool.query(`
      SELECT * FROM characters WHERE id = $1
    `, [characterId]);
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    const processedCharacter = processComplexCharacter(character);
    
    const messages = [
      {
        role: 'system',
        content: processedCharacter.processed_prompt
      },
      {
        role: 'user',
        content: message
      }
    ];
    
    // Use provided model or default to mythomax
    const selectedModel = model || 'gryphe/mythomax-l2-13b';
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        max_tokens: 300,
        temperature: 0.8
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;
      
      res.json({
        success: true,
        response: aiResponse,
        model_used: selectedModel,
        character: {
          name: character.name,
          ethnicity: character.ethnicity
        }
      });
    } else {
      console.error('OpenRouter API error:', data);
      res.status(400).json({
        success: false,
        error: 'Failed to get AI response',
        details: data.error?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
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
});
