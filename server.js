const express = require('express');
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
    
    if (characterData.ai_instructions && characterData.ai_instructions.personality_prompt) {
      aiPrompt += `. ${characterData.ai_instructions.personality_prompt}`;
    }

    if (characterData.bible_personality && characterData.bible_personality.big_five) {
      const bigFive = characterData.bible_personality.big_five;
      aiPrompt += `\n\nPersonality Profile:`;
      aiPrompt += `\n- Openness: ${bigFive.openness}/100`;
      aiPrompt += `\n- Conscientiousness: ${bigFive.conscientiousness}/100`;
      aiPrompt += `\n- Extraversion: ${bigFive.extraversion}/100`;
      aiPrompt += `\n- Agreeableness: ${bigFive.agreeableness}/100`;
      aiPrompt += `\n- Neuroticism: ${bigFive.neuroticism}/100`;
    }

    if (characterData.personality_traits && characterData.personality_traits.core_traits) {
      aiPrompt += `\n\nCore traits: ${characterData.personality_traits.core_traits.join(', ')}`;
    }
    
    if (characterData.chat_behavior && characterData.chat_behavior.flirting_style) {
      aiPrompt += `\nFlirting style: ${characterData.chat_behavior.flirting_style}`;
    }

    aiPrompt += `\n\nAlways stay in character as ${characterData.name}. Respond naturally based on your personality.`;

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

// Get available models
app.get('/api/models', (req, res) => {
 const models = [
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', cost: '$', roleplayRating: '8.8/10', description: 'Top-tier creative and engaging personalities' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$$', roleplayRating: '8.5/10', description: 'Reliable and intelligent character interactions' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '$', roleplayRating: '8.0/10', description: 'Excellent free-tier roleplay option' }
];

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '9.5/10', description: 'Best overall for deep character roleplay' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', cost: '$

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '9.8/10', description: 'Most creative and nuanced personality simulation' },
    { id: 'gryphe/mythalion-13b', name: 'Mythalion 13B', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '9.2/10', description: 'Built specifically for roleplay and creative writing' },
    { id: 'neversleep/noromaid-mixtral-8x7b-instruct', name: 'Noromaid Mixtral 8x7B', cost: '$', roleplayRating: '9.0/10', description: 'Excellent for character consistency and creativity' },
    { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '8.8/10', description: 'Top-tier creative and engaging personalities' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$', roleplayRating: '8.5/10', description: 'Reliable and intelligent character interactions' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', cost: '$', roleplayRating: '8.3/10', description: 'Good balance of creativity and coherence' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', cost: '$', roleplayRating: '8.2/10', description: 'Strong logical roleplay with personality depth' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '8.0/10', description: 'Excellent free-tier roleplay option' },
    { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM 2 8x22B', cost: '$', roleplayRating: '7.8/10', description: 'Great for complex multi-turn conversations' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '7.5/10', description: 'Quick responses with good personality' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '7.2/10', description: 'Reliable and cost-effective for basic roleplay' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '7.0/10', description: 'Good personality simulation, very affordable' },
    { id: 'google/gemma-2-9b', name: 'Gemma 2 9B', cost: 'FREE', roleplayRating: '6.8/10', description: 'Decent roleplay capabilities, completely free' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', cost: 'FREE', roleplayRating: '6.5/10', description: 'Solid free option with good character consistency' },
    { id: 'alpindale/goliath-120b', name: 'Goliath 120B', cost: '$', roleplayRating: '8.5/10', description: 'Massive model with incredible detail and personality depth' },
    { id: 'cognitivecomputations/dolphin-mixtral-8x7b', name: 'Dolphin Mixtral 8x7B', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '7.8/10', description: 'Creative and expressive for roleplay scenarios' },
    { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Nous Hermes 2 Mixtral', cost: '

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '7.6/10', description: 'Excellent instruction following with personality' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', cost: '$

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '9.0/10', description: 'Massive open-source model with exceptional capabilities' },
    { id: 'openai/o1-preview', name: 'OpenAI o1-preview', cost: '$

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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});, roleplayRating: '8.8/10', description: 'Advanced reasoning model with deep character understanding' }
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

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});