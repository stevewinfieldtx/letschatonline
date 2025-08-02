const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

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
    // Force drop and recreate with correct structure
    await pool.query(`DROP TABLE IF EXISTS picture_purchases CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS chat_messages CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS user_sessions CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS characters CASCADE`);
    
    await pool.query(`
      CREATE TABLE characters (
        id SERIAL PRIMARY KEY,
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

    await pool.query(`
      CREATE TABLE user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        character_id INTEGER REFERENCES characters(id),
        user_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE chat_messages (
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

    await pool.query(`
      CREATE TABLE picture_purchases (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        character_id INTEGER REFERENCES characters(id),
        picture_type VARCHAR(20) NOT NULL,
        price_usd DECIMAL NOT NULL,
        payment_id VARCHAR(255),
        image_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables recreated with ethnicity column');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
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

    if (characterData.voice_profile && characterData.voice_profile.tone) {
      aiPrompt += `\nVoice tone: ${characterData.voice_profile.tone}`;
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
    const result = await pool.query(`
      SELECT id, name, ethnicity, personality_traits, bible_personality, voice_profile
      FROM characters 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
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

// Chat endpoint with FULL Intelligent Memory System
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message, sessionId } = req.body;
    
    const characterResult = await pool.query(`
      SELECT * FROM characters WHERE id = $1
    `, [characterId]);
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    const processedCharacter = processComplexCharacter(character);
    
    // INTELLIGENT MEMORY RETRIEVAL
    const now = new Date();
    const memoryResult = await pool.query(`
      SELECT 
        user_message, 
        assistant_message, 
        timestamp,
        memory_weight,
        importance_score,
        EXTRACT(EPOCH FROM ($1 - timestamp)) / 3600 as hours_ago
      FROM chat_messages 
      WHERE session_id = $2 AND character_id = $3
      ORDER BY 
        (memory_weight * importance_score * EXP(-EXTRACT(EPOCH FROM ($1 - timestamp)) / 86400)) DESC,
        timestamp DESC
      LIMIT 15
    `, [now, sessionId, characterId]);
    
    // Build conversation context with memory weights
    const messages = [
      {
        role: 'system',
        content: processedCharacter.processed_prompt
      }
    ];
    
    // Add memory context if exists
    if (memoryResult.rows.length > 0) {
      let memoryContext = "\n\nMemory Context (what you remember about this conversation):\n";
      memoryResult.rows.reverse().forEach((msg, idx) => {
        const memoryStrength = msg.memory_weight * msg.importance_score;
        const hoursAgo = Math.round(msg.hours_ago * 10) / 10;
        
        if (memoryStrength > 0.3) { // Only include significant memories
          memoryContext += `- ${hoursAgo}h ago: User said "${msg.user_message}" (importance: ${msg.importance_score}/10)\n`;
          if (msg.assistant_message) {
            memoryContext += `  You responded: "${msg.assistant_message.substring(0, 100)}..."\n`;
          }
        }
      });
      
      messages[0].content += memoryContext;
    }
    
    // Add recent conversation (last 3 exchanges)
    const recentHistory = memoryResult.rows.slice(-6); // Last 3 exchanges
    recentHistory.forEach(msg => {
      if (msg.user_message) {
        messages.push({ role: 'user', content: msg.user_message });
      }
      if (msg.assistant_message) {
        messages.push({ role: 'assistant', content: msg.assistant_message });
      }
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: messages,
        max_tokens: 300,
        temperature: 0.8
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;
      
      // CALCULATE IMPORTANCE SCORE (1-10)
      let importanceScore = 5; // Default
      
      // Increase importance for emotional content
      const emotionalWords = ['love', 'hate', 'excited', 'sad', 'angry', 'happy', 'afraid', 'nervous', 'amazing', 'terrible'];
      const messageText = (message + ' ' + aiResponse).toLowerCase();
      emotionalWords.forEach(word => {
        if (messageText.includes(word)) importanceScore += 1;
      });
      
      // Increase importance for personal information
      const personalWords = ['my', 'i am', 'i feel', 'i think', 'i want', 'i need', 'my family', 'my job'];
      personalWords.forEach(phrase => {
        if (messageText.includes(phrase)) importanceScore += 1;
      });
      
      // Increase importance for questions
      if (message.includes('?')) importanceScore += 1;
      
      // Cap at 10
      importanceScore = Math.min(importanceScore, 10);
      
      // MEMORY WEIGHT STARTS AT 1.0, WILL DECAY OVER TIME
      const memoryWeight = 1.0;
      
      // Save to database with memory system
      await pool.query(`
        INSERT INTO chat_messages (
          session_id, character_id, user_message, assistant_message, 
          memory_weight, importance_score
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [sessionId, characterId, message, aiResponse, memoryWeight, importanceScore]);
      
      // MEMORY DECAY - Update old messages
      await pool.query(`
        UPDATE chat_messages 
        SET memory_weight = memory_weight * 0.95
        WHERE session_id = $1 AND character_id = $2 
        AND timestamp < NOW() - INTERVAL '1 hour'
      `, [sessionId, characterId]);
      
      res.json({
        success: true,
        response: aiResponse,
        character: {
          name: character.name,
          ethnicity: character.ethnicity
        },
        memory_info: {
          importance_score: importanceScore,
          memory_weight: memoryWeight,
          context_messages: memoryResult.rows.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to get AI response'
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat failed'
    });
  }
});

// Picture purchase endpoint with FULL functionality
app.post('/api/purchase-picture', async (req, res) => {
  try {
    const { sessionId, characterId, pictureType, paymentId } = req.body;
    
    // Simple pricing: $0.50 regular, $0.75 intimate
    const pricing = {
      'regular': 0.50,
      'intimate': 0.75
    };
    
    const price = pricing[pictureType];
    if (!price) {
      return res.status(400).json({ error: 'Invalid picture type' });
    }
    
    // Get character info for image generation
    const characterResult = await pool.query(`
      SELECT name, ethnicity, personality_traits FROM characters WHERE id = $1
    `, [characterId]);
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    
    // Record purchase
    const purchaseResult = await pool.query(`
      INSERT INTO picture_purchases (session_id, character_id, picture_type, price_usd, payment_id, status)
      VALUES ($1, $2, $3, $4, $5, 'paid')
      RETURNING *
    `, [sessionId, characterId, pictureType, price, paymentId]);
    
    // Generate image prompt based on character and type
    let imagePrompt = `Portrait of ${character.name}, a beautiful ${character.ethnicity} woman`;
    
    if (character.personality_traits?.profession) {
      imagePrompt += `, ${character.personality_traits.profession}`;
    }
    
    let isTopless = false;
    
    if (pictureType === 'regular') {
      // Regular pictures - cute, casual, elegant
      const styles = [
        ', wearing casual clothes, smiling, natural lighting, friendly expression',
        ', wearing elegant dress, professional photo, sophisticated pose',
        ', casual selfie style, friendly expression, natural beauty',
        ', wearing cute outfit, happy expression, bright lighting'
      ];
      imagePrompt += styles[Math.floor(Math.random() * styles.length)];
    } else {
      // Intimate pictures - with 15% chance of topless bonus!
      isTopless = Math.random() < 0.15; // 15% chance
      
      if (isTopless) {
        imagePrompt += ', artistic topless portrait, tasteful nude, artistic lighting, beautiful, sensual, high fashion style';
      } else {
        const intimateStyles = [
          ', wearing sexy black lingerie, seductive pose, soft romantic lighting',
          ', wearing bikini, beach setting, confident pose, sunset lighting',
          ', wearing lace bra and panties, bedroom setting, alluring pose',
          ', wearing red lingerie, romantic candlelight, elegant and sensual'
        ];
        imagePrompt += intimateStyles[Math.floor(Math.random() * intimateStyles.length)];
      }
    }
    
    imagePrompt += ', high quality, photorealistic, beautiful, 4k, professional photography';
    
    // Here you would integrate with DALL-E, Midjourney, or Stable Diffusion
    // For now, simulate with a unique URL that indicates the type
    const imageUrl = `https://generated-images.letschatonline.com/${pictureType}-${isTopless ? 'topless-' : ''}${purchaseResult.rows[0].id}.jpg`;
    
    // Update with generated image
    await pool.query(`
      UPDATE picture_purchases 
      SET image_url = $1, status = 'completed'
      WHERE id = $2
    `, [imageUrl, purchaseResult.rows[0].id]);
    
    res.json({
      success: true,
      image_url: imageUrl,
      price_paid: price,
      picture_type: pictureType,
      is_topless: isTopless,
      character_name: character.name,
      purchase_id: purchaseResult.rows[0].id,
      prompt_used: imagePrompt
    });
  } catch (error) {
    console.error('Picture purchase error:', error);
    res.status(500).json({ error: 'Picture purchase failed' });
  }
});

// Get user's purchased pictures
app.get('/api/my-pictures/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(`
      SELECT pp.*, c.name as character_name
      FROM picture_purchases pp
      JOIN characters c ON pp.character_id = c.id
      WHERE pp.session_id = $1 AND pp.status = 'completed'
      ORDER BY pp.created_at DESC
    `, [sessionId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Pictures error:', error);
    res.status(500).json({ error: 'Failed to get pictures' });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 LetsChat Online server running on port ${PORT}`);
    console.log(`🎭 Complex character processing enabled`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});