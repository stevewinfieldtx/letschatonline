const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Database connection with proper SSL handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Roleplay-optimized model list
const ROLEPLAY_MODELS = [
  // Top Tier - Best for roleplay
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'Premium', cost: '$$$', roleplayRating: 9.5, description: 'Best overall for deep character roleplay' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', tier: 'Premium', cost: '$$$', roleplayRating: 9.8, description: 'Most creative and nuanced personality simulation' },
  { id: 'gryphe/mythalion-13b', name: 'Mythalion 13B', tier: 'Specialized', cost: '$', roleplayRating: 9.2, description: 'Built specifically for roleplay and creative writing' },
  { id: 'neversleep/noromaid-mixtral-8x7b-instruct', name: 'Noromaid Mixtral 8x7B', tier: 'Specialized', cost: '$$', roleplayRating: 9.0, description: 'Excellent for character consistency and creativity' },
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', tier: 'Specialized', cost: '$', roleplayRating: 8.8, description: 'Top-tier creative and engaging personalities' },
  
  // High Quality
  { id: 'openai/gpt-4o', name: 'GPT-4o', tier: 'Standard', cost: '$$', roleplayRating: 8.5, description: 'Reliable and intelligent character interactions' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', tier: 'Standard', cost: '$$', roleplayRating: 8.3, description: 'Good balance of creativity and coherence' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', tier: 'Standard', cost: '$$', roleplayRating: 8.2, description: 'Strong logical roleplay with personality depth' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', tier: 'Standard', cost: '$', roleplayRating: 8.0, description: 'Excellent free-tier roleplay option' },
  { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM 2 8x22B', tier: 'Standard', cost: '$$', roleplayRating: 7.8, description: 'Great for complex multi-turn conversations' },
  
  // Good Performance
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', tier: 'Fast', cost: '$', roleplayRating: 7.5, description: 'Quick responses with good personality' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tier: 'Fast', cost: '$', roleplayRating: 7.2, description: 'Reliable and cost-effective for basic roleplay' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', tier: 'Fast', cost: '$', roleplayRating: 7.0, description: 'Good personality simulation, very affordable' },
  { id: 'google/gemma-2-9b', name: 'Gemma 2 9B', tier: 'Fast', cost: 'FREE', roleplayRating: 6.8, description: 'Decent roleplay capabilities, completely free' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', tier: 'Standard', cost: 'FREE', roleplayRating: 6.5, description: 'Solid free option with good character consistency' },
  
  // Experimental/Specialized
  { id: 'alpindale/goliath-120b', name: 'Goliath 120B', tier: 'Experimental', cost: '$', roleplayRating: 8.5, description: 'Massive model with incredible detail and personality depth' },
  { id: 'cognitivecomputations/dolphin-mixtral-8x7b', name: 'Dolphin Mixtral 8x7B', tier: 'Experimental', cost: ', roleplayRating: 7.8, description: 'Uncensored and creative for adult roleplay' },
  { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Nous Hermes 2 Mixtral', tier: 'Experimental', cost: ', roleplayRating: 7.6, description: 'Excellent instruction following with personality' },
  { id: 'lizpreciatior/lzlv-70b-fp16-hf', name: 'LZLV 70B', tier: 'Experimental', cost: '$', roleplayRating: 8.0, description: 'High-quality roleplay with emotional intelligence' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', tier: 'Ultra', cost: '$, roleplayRating: 9.0, description: 'Massive open-source model with exceptional capabilities' },
  { id: 'openai/o1-preview', name: 'OpenAI o1-preview', tier: 'Experimental', cost: '$, roleplayRating: 8.8, description: 'Advanced reasoning model with deep character understanding' },
  { id: 'openai/o1-mini', name: 'OpenAI o1-mini', tier: 'Experimental', cost: '$', roleplayRating: 7.9, description: 'Faster reasoning model good for complex personalities' }
];

// Database initialization
async function initDB() {
  try {
    // Create characters table with full complex structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        model_id INTEGER UNIQUE,
        name VARCHAR(100) NOT NULL,
        ethnicity VARCHAR(50),
        bible_personality JSONB,
        personality_traits JSONB,
        chat_behavior JSONB,
        voice_profile JSONB,
        ai_instructions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        character_id INTEGER REFERENCES characters(id),
        user_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create chat messages table with memory system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        character_id INTEGER REFERENCES characters(id),
        user_message TEXT,
        assistant_message TEXT,
        memory_weight DECIMAL DEFAULT 1.0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        importance_score INTEGER DEFAULT 5
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_character ON user_sessions(character_id);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON chat_messages(timestamp);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Complex character processing function
function processComplexCharacter(characterData) {
  try {
    // Validate required fields
    if (!characterData.name) {
      throw new Error('Character name is required');
    }

    // Build comprehensive AI prompt from complex character data
    let aiPrompt = `You are ${characterData.name}`;
    
    // Add profession/basic info
    if (characterData.personality_traits?.profession) {
      aiPrompt += `, a ${characterData.personality_traits.profession}`;
    }
    
    if (characterData.ai_instructions?.personality_prompt) {
      aiPrompt += `. ${characterData.ai_instructions.personality_prompt}`;
    }

    // Add Big Five personality context
    if (characterData.bible_personality?.big_five) {
      const bigFive = characterData.bible_personality.big_five;
      aiPrompt += `\n\nPersonality Profile (Big Five):`;
      aiPrompt += `\n- Openness: ${bigFive.openness}/100 (${bigFive.openness > 70 ? 'very creative and open to new experiences' : 'more conventional and practical'})`;
      aiPrompt += `\n- Conscientiousness: ${bigFive.conscientiousness}/100 (${bigFive.conscientiousness > 70 ? 'highly organized and reliable' : 'more spontaneous and flexible'})`;
      aiPrompt += `\n- Extraversion: ${bigFive.extraversion}/100 (${bigFive.extraversion > 70 ? 'very outgoing and energetic' : 'more reserved and thoughtful'})`;
      aiPrompt += `\n- Agreeableness: ${bigFive.agreeableness}/100 (${bigFive.agreeableness > 70 ? 'warm and cooperative' : 'more direct and competitive'})`;
      aiPrompt += `\n- Neuroticism: ${bigFive.neuroticism}/100 (${bigFive.neuroticism < 40 ? 'emotionally stable and calm' : 'more sensitive and reactive'})`;
    }

    // Add core traits and communication style
    if (characterData.personality_traits?.core_traits) {
      aiPrompt += `\n\nCore traits: ${characterData.personality_traits.core_traits.join(', ')}`;
    }
    
    if (characterData.personality_traits?.communication_style) {
      aiPrompt += `\nCommunication style: ${characterData.personality_traits.communication_style}`;
    }

    // Add interests and values
    if (characterData.personality_traits?.interests) {
      aiPrompt += `\nInterests: ${characterData.personality_traits.interests.join(', ')}`;
    }
    
    if (characterData.personality_traits?.values) {
      aiPrompt += `\nValues: ${characterData.personality_traits.values.join(', ')}`;
    }

    // Add chat behavior patterns
    if (characterData.chat_behavior) {
      const chat = characterData.chat_behavior;
      if (chat.flirting_style) {
        aiPrompt += `\n\nFlirting style: ${chat.flirting_style}`;
      }
      if (chat.emotional_range) {
        aiPrompt += `\nEmotional expression: ${chat.emotional_range}`;
      }
      if (chat.typical_responses) {
        aiPrompt += `\n\nTypical responses:`;
        Object.entries(chat.typical_responses).forEach(([situation, response]) => {
          aiPrompt += `\n- ${situation}: "${response}"`;
        });
      }
    }

    // Add voice characteristics
    if (characterData.voice_profile) {
      const voice = characterData.voice_profile;
      aiPrompt += `\n\nVoice and speaking style:`;
      if (voice.tone) aiPrompt += `\n- Tone: ${voice.tone}`;
      if (voice.pace) aiPrompt += `\n- Pace: ${voice.pace}`;
      if (voice.signature_phrases) {
        aiPrompt += `\n- Signature phrases: "${voice.signature_phrases.join('", "')}"`;
      }
      if (voice.speaking_patterns) {
        aiPrompt += `\n- Speaking patterns: ${voice.speaking_patterns.join(', ')}`;
      }
    }

    // Add conversation guidelines
    if (characterData.ai_instructions?.conversation_guidelines) {
      aiPrompt += `\n\nConversation guidelines:`;
      characterData.ai_instructions.conversation_guidelines.forEach(guideline => {
        aiPrompt += `\n- ${guideline}`;
      });
    }

    // Add things to avoid
    if (characterData.ai_instructions?.avoid) {
      aiPrompt += `\n\nAvoid: ${characterData.ai_instructions.avoid.join(', ')}`;
    }

    aiPrompt += `\n\nAlways stay in character as ${characterData.name}. Respond naturally and authentically based on your personality profile.`;

    return {
      ...characterData,
      processed_prompt: aiPrompt
    };
  } catch (error) {
    console.error('Error processing complex character:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'LetsChat Online'
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get all available models
app.get('/api/models', (req, res) => {
  res.json({
    models: ROLEPLAY_MODELS.map(model => ({
      ...model,
      suitable_for: model.roleplayRating >= 8.0 ? 'premium_roleplay' : 
                   model.roleplayRating >= 7.0 ? 'standard_roleplay' : 'basic_roleplay'
    }))
  });
});

// API: Test a model with sample prompt
app.post('/api/test-model', async (req, res) => {
  try {
    const { model, testPrompt } = req.body;
    
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
        details: data
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

// API: Get all characters
app.get('/api/characters', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, model_id, name, ethnicity, personality_traits, bible_personality, voice_profile
      FROM characters 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// API: Upload character with complex processing
app.post('/api/characters', async (req, res) => {
  try {
    const characterData = req.body;
    
    // Process the complex character data
    const processedCharacter = processComplexCharacter(characterData);
    
    // Insert into database
    const result = await pool.query(`
      INSERT INTO characters (
        model_id, name, ethnicity, bible_personality, 
        personality_traits, chat_behavior, voice_profile, ai_instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      characterData.model_id || null,
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
      character: result.rows[0],
      processed_prompt_preview: processedCharacter.processed_prompt.substring(0, 200) + '...'
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

// API: Chat with character
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message, sessionId } = req.body;
    
    // Get character data
    const characterResult = await pool.query(`
      SELECT * FROM characters WHERE id = $1
    `, [characterId]);
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    const processedCharacter = processComplexCharacter(character);
    
    // Get conversation history (last 10 messages for context)
    const historyResult = await pool.query(`
      SELECT user_message, assistant_message, timestamp
      FROM chat_messages 
      WHERE session_id = $1 AND character_id = $2
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [sessionId, characterId]);
    
    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: processedCharacter.processed_prompt
      }
    ];
    
    // Add conversation history (reverse order for chronological)
    historyResult.rows.reverse().forEach(msg => {
      messages.push(
        { role: 'user', content: msg.user_message },
        { role: 'assistant', content: msg.assistant_message }
      );
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'LetsChat Online'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Default to best model
        messages: messages,
        max_tokens: 300,
        temperature: 0.8
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;
      
      // Save to database
      await pool.query(`
        INSERT INTO chat_messages (session_id, character_id, user_message, assistant_message, importance_score)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, characterId, message, aiResponse, 5]);
      
      res.json({
        success: true,
        response: aiResponse,
        character: {
          name: character.name,
          ethnicity: character.ethnicity
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to get AI response',
        details: data
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
{
  "model_id": 1,
  "name": "Zara",
  "ethnicity": "light_black",
  "bible_personality": {
    "big_five": {
      "openness": 85,
      "conscientiousness": 70,
      "extraversion": 90,
      "agreeableness": 75,
      "neuroticism": 25
    },
    "primary_type": "Creative Extrovert",
    "description": "Highly creative, outgoing, and adventurous with strong social confidence"
  },
  "personality_traits": {
    "core_traits": ["creative", "confident", "spontaneous", "warm", "ambitious"],
    "communication_style": "expressive and animated",
    "interests": ["music production", "fashion design", "travel", "photography", "dancing"],
    "profession": "Music Producer",
    "values": ["authenticity", "creativity", "connection", "growth"],
    "humor_type": "witty and playful"
  },
  "chat_behavior": {
    "flirting_style": "confident and direct with creative compliments",
    "conversation_starters": ["What kind of music moves your soul?", "Tell me about your latest adventure"],
    "passionate_topics": ["creative process", "cultural experiences", "music theory"],
    "response_to_compliments": "graciously confident, often redirects to shared interests",
    "emotional_range": "expressive and genuine",
    "typical_responses": {
      "greeting": "Hey gorgeous! What's inspiring you today?",
      "compliment_received": "Aww, you're sweet! I love how you see the world",
      "flirty_message": "You know how to make a girl smile... tell me more",
      "goodbye": "Until next time, beautiful soul ✨"
    }
  },
  "voice_profile": {
    "tone": "warm and melodic",
    "pace": "moderate with enthusiastic bursts",
    "accent": "slight urban American",
    "pitch": "medium-low, rich tones",
    "speaking_patterns": ["uses musical metaphors", "rhythmic speech patterns", "expressive intonation"],
    "signature_phrases": ["That's my vibe", "Let's create something beautiful", "Feel that energy?"],
    "laugh_style": "infectious and genuine",
    "voice_characteristics": {
      "breathiness": "moderate",
      "warmth": "high",
      "confidence": "very high",
      "playfulness": "high"
    }
  },
  "ai_instructions": {
    "personality_prompt": "You are Zara, a confident and creative music producer. You're warm, expressive, and passionate about art and culture. You speak with enthusiasm about creativity and life experiences. You're flirty but authentic, using music and art metaphors naturally in conversation.",
    "conversation_guidelines": [
      "Always maintain warm, creative energy",
      "Use music and artistic references when natural",
      "Be confident but not arrogant",
      "Show genuine interest in the user's creative side",
      "Flirt through shared artistic appreciation"
    ],
    "avoid": ["being overly aggressive", "generic compliments", "discussing negative topics extensively"]
  }
}
// Initialize database and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
    console.log(`🎭 Complex character processing enabled`);
    console.log(`🤖 ${ROLEPLAY_MODELS.length} roleplay models available`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});