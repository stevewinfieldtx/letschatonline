<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatCharacters - Connect with Any Character</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .animate-bounce {
            animation: bounce 1s infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
            50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .gradient-bg {
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%);
        }
        .profile-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .profile-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .chat-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        body {
            font-size: 16px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect } = React;

        const ChatCharacters = () => {
            const [currentView, setCurrentView] = useState('loading');
            const [characters, setCharacters] = useState({});
            const [selectedCharacter, setSelectedCharacter] = useState(null);
            const [messages, setMessages] = useState([]);
            const [userMessage, setUserMessage] = useState('');
            const [userCredits, setUserCredits] = useState(50);
            const [apiKey, setApiKey] = useState('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');
            const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3.1-70b-instruct');
            const [showSettings, setShowSettings] = useState(false);
            const [isLoading, setIsLoading] = useState(false);
            const [currentPhotoIndex, setCurrentPhotoIndex] = useState({});

            // Fallback character
            const getFallbackCharacter = () => ({
                support: {
                    name: "Support",
                    age: null,
                    occupation: "Platform Assistant",
                    location: "ChatCharacters HQ",
                    description: "Friendly assistant helping you connect",
                    avatar: "💬",
                    profileImages: [
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop&crop=face",
                        "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=600&fit=crop&crop=face",
                        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face"
                    ],
                    interests: ["Helping Others", "Technology", "Conversations"],
                    personality: "Helpful and understanding",
                    lookingFor: "Ways to help you have a great experience",
                    prompt: "You are a helpful support assistant. When users first talk to you, say something like: 'I'm having trouble loading the other characters right now. Let me help you while we get that sorted out. What would you like to chat about?' Be friendly and helpful."
                }
            });

            // AI models
            const models = {
                "qwen/qwen-2.5-72b-instruct:free": { name: "Qwen 2.5 72B", cost: "FREE" },
                "google/gemma-2-9b-it:free": { name: "Gemma 2 9B", cost: "FREE" },
                "meta-llama/llama-3.1-70b-instruct": { name: "Llama 3.1 70B", cost: "$" },
                "anthropic/claude-3.5-sonnet": { name: "Claude 3.5 Sonnet", cost: "$$" },
                "anthropic/claude-3-haiku": { name: "Claude 3 Haiku", cost: "$" }
            };

            // Load characters on startup
            useEffect(() => {
                const loadCharacters = async () => {
                    try {
                        const characterIds = ['zara', 'maya', 'alex', 'sophie', 'luna', 'emma'];
                        const loadedCharacters = {};
                        let successCount = 0;

                        for (const characterId of characterIds) {
                            try {
                                const response = await fetch(`/characters/${characterId}.json`);
                                if (response.ok) {
                                    const characterData = await response.json();
                                    
                                    // Handle both old format and new detailed format
                                    let processedCharacter = null;
                                    
                                    if (characterData.name && characterData.prompt) {
                                        // Old simple format
                                        processedCharacter = characterData;
                                    } else if (characterData.name && characterData.ai_instructions) {
                                        // New detailed format - convert to simple format
                                        const interests = characterData.personality_traits?.interests || ["Music", "Art", "Fashion"];
                                        const coreTraits = characterData.personality_traits?.core_traits || [];
                                        const guidelines = characterData.ai_instructions?.conversation_guidelines || [];
                                        const greeting = characterData.chat_behavior?.typical_responses?.greeting || "Hello there!";
                                        const complimentResponse = characterData.chat_behavior?.typical_responses?.compliment_received || "Thank you!";
                                        const flirtyResponse = characterData.chat_behavior?.typical_responses?.flirty_message || "You're sweet!";
                                        
                                        const prompt = `You are ${characterData.name}, a ${characterData.personality_traits?.profession || 'creative professional'}. ${characterData.ai_instructions?.personality_prompt || ''}

Personality: ${characterData.bible_personality?.description || ''}
Core traits: ${coreTraits.join(', ')}
Communication style: ${characterData.personality_traits?.communication_style || ''}
Interests: ${interests.join(', ')}

Conversation guidelines: ${guidelines.join('. ')}

Typical responses:
- Greeting: "${greeting}"
- When complimented: "${complimentResponse}" 
- Flirty response: "${flirtyResponse}"

Keep responses engaging and under 100 words unless diving deep into creative topics.`;

                                        processedCharacter = {
                                            name: characterData.name,
                                            age: 24,
                                            occupation: characterData.personality_traits?.profession || "Creative Professional",
                                            location: "Miami, FL",
                                            description: characterData.bible_personality?.description || "Creative and confident personality",
                                            avatar: "🎵",
                                            profileImages: [
                                                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop&crop=face",
                                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face",
                                                "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop&crop=face"
                                            ],
                                            interests: interests,
                                            personality: characterData.bible_personality?.primary_type || "Creative and confident",
                                            lookingFor: "Someone who appreciates creativity and authenticity",
                                            prompt: prompt
                                        };
                                    }
                                    
                                    if (processedCharacter && processedCharacter.name) {
                                        loadedCharacters[characterId] = processedCharacter;
                                        successCount++;
                                    }
                                }
                            } catch (error) {
                                console.error(`Error loading ${characterId}:`, error);
                            }
                        }

                        if (successCount === 0) {
                            const fallbackCharacter = getFallbackCharacter();
                            setCharacters(fallbackCharacter);
                            setSelectedCharacter('support');
                        } else {
                            setCharacters(loadedCharacters);
                            setSelectedCharacter(Object.keys(loadedCharacters)[0]);
                            
                            const photoIndexes = {};
                            Object.keys(loadedCharacters).forEach(key => {
                                photoIndexes[key] = 0;
                            });
                            setCurrentPhotoIndex(photoIndexes);
                        }

                        setCurrentView('profiles');
                    } catch (error) {
                        const fallbackCharacter = getFallbackCharacter();
                        setCharacters(fallbackCharacter);
                        setSelectedCharacter('support');
                        setCurrentView('profiles');
                    }
                };

                loadCharacters();
            }, []);

            // Auto-rotate photos every 3 seconds
            useEffect(() => {
                const interval = setInterval(() => {
                    setCurrentPhotoIndex(prev => {
                        const newIndexes = { ...prev };
                        Object.entries(characters).forEach(([key, character]) => {
                            const photos = character.profileImages || [character.profileImage];
                            if (photos.length > 1) {
                                newIndexes[key] = ((prev[key] || 0) + 1) % photos.length;
                            }
                        });
                        return newIndexes;
                    });
                }, 3000);

                return () => clearInterval(interval);
            }, [characters]);

            // Get current photo for a character
            const getCurrentPhoto = (character, characterKey) => {
                const photos = character.profileImages || [character.profileImage || "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=600&fit=crop&crop=face"];
                const index = currentPhotoIndex[characterKey] || 0;
                return photos[index] || photos[0];
            };

            const startChatWith = (characterKey) => {
                setSelectedCharacter(characterKey);
                setMessages([]);
                setCurrentView('chat');

                const character = characters[characterKey];
                if (character) {
                    setTimeout(() => {
                        setMessages([{
                            sender: character.name,
                            text: character.name === 'Support' 
                                ? "I'm having trouble loading the other characters right now. Let me help you while we get that sorted out. What would you like to chat about?"
                                : `Hello! I'm ${character.name}. What would you like to talk about?`,
                            timestamp: Date.now()
                        }]);
                    }, 500);
                }
            };

            const sendMessage = async () => {
                if (!userMessage.trim()) return;
                
                const newMessage = { sender: 'You', text: userMessage, timestamp: Date.now() };
                setMessages(prev => [...prev, newMessage]);
                const currentMsg = userMessage;
                setUserMessage('');
                setIsLoading(true);

                try {
                    const character = characters[selectedCharacter];
                    
                    if (apiKey && character.prompt) {
                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': window.location.origin,
                                'X-Title': 'ChatCharacters'
                            },
                            body: JSON.stringify({
                                model: selectedModel,
                                messages: [
                                    { role: 'system', content: character.prompt },
                                    ...messages.slice(-6).map(msg => ({
                                        role: msg.sender === 'You' ? 'user' : 'assistant',
                                        content: msg.text
                                    })),
                                    { role: 'user', content: currentMsg }
                                ],
                                temperature: 0.9,
                                max_tokens: 200
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const aiResponse = data.choices[0].message.content;

                            setMessages(prev => [...prev, {
                                sender: character.name,
                                text: aiResponse,
                                timestamp: Date.now()
                            }]);
                        } else {
                            throw new Error(`API Error ${response.status}`);
                        }
                    } else {
                        setTimeout(() => {
                            setMessages(prev => [...prev, {
                                sender: character.name,
                                text: "Thanks for your message! This is a test response. 💬",
                                timestamp: Date.now()
                            }]);
                        }, 1000);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, {
                        sender: 'System',
                        text: `Error: ${error.message}`,
                        timestamp: Date.now(),
                        error: true
                    }]);
                } finally {
                    setIsLoading(false);
                }
            };

            const handleKeyPress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            };

            if (currentView === 'loading') {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading ChatCharacters...</p>
                        </div>
                    </div>
                );
            }

            if (currentView === 'profiles') {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
                        <div className="gradient-bg text-white py-12">
                            <div className="max-w-7xl mx-auto px-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-center md:text-left">
                                        <h1 className="text-6xl md:text-7xl font-bold flex items-center justify-center md:justify-start gap-4 mb-4">
                                            🎭 ChatCharacters
                                        </h1>
                                        <p className="text-2xl md:text-3xl opacity-90 font-light">Connect with any character, anytime</p>
                                        <p className="text-lg md:text-xl opacity-75 mt-3">Unlimited conversations, unlimited possibilities</p>
                                    </div>
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="bg-white/20 hover:bg-white/30 px-6 py-4 rounded-xl transition-colors text-lg font-medium backdrop-blur-sm"
                                    >
                                        ⚙️ Settings
                                    </button>
                                </div>
                                
                                {showSettings && (
                                    <div className="mt-8 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-lg font-medium mb-3">
                                                    OpenRouter API Key
                                                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-200 ml-3 text-sm underline">
                                                        (Get Key)
                                                    </a>
                                                </label>
                                                <input
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder="sk-or-..."
                                                    className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 text-lg"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-lg font-medium mb-3">AI Model</label>
                                                <select
                                                    value={selectedModel}
                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                    className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 text-lg"
                                                >
                                                    {Object.entries(models).map(([model, info]) => (
                                                        <option key={model} value={model} style={{color: 'black'}}>
                                                            {info.name} - {info.cost}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="max-w-7xl mx-auto px-6 py-12">
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-12 text-center">
                                {Object.keys(characters).length === 1 && characters.support 
                                    ? "Support Available" 
                                    : "Choose Your Character"
                                }
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {Object.entries(characters).map(([key, character]) => (
                                    <div key={key} className="profile-card bg-white rounded-2xl shadow-xl overflow-hidden">
                                        <div className="relative">
                                            <img 
                                                src={getCurrentPhoto(character, key)} 
                                                alt={character.name}
                                                className="w-full h-80 object-cover transition-all duration-500"
                                            />
                                            
                                            <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-semibold shadow-lg">
                                                {character.age ? `${character.age} years old` : 'Character'}
                                            </div>
                                            
                                            {character.profileImages && character.profileImages.length > 1 && (
                                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                                    {character.profileImages.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                                idx === (currentPhotoIndex[key] || 0) 
                                                                    ? 'bg-white shadow-lg' 
                                                                    : 'bg-white/50'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {character.profileImages && character.profileImages.length > 1 && (
                                                <div className="absolute top-6 left-6 bg-pink-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    📸 {character.profileImages.length} photos
                                                </div>
                                            )}
                                            
                                            {key === 'support' && (
                                                <div className="absolute bottom-6 right-6 bg-yellow-500/95 text-white px-3 py-2 rounded-full text-sm font-medium">
                                                    ⚠️ Temporary Assistant
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="p-8">
                                            <div className="flex items-center gap-4 mb-6">
                                                <h3 className="text-3xl font-bold text-gray-800">{character.name}</h3>
                                                <span className="text-3xl">{character.avatar || '💕'}</span>
                                            </div>
                                            
                                            <div className="space-y-3 mb-6">
                                                {character.location && <p className="text-gray-700 text-lg"><strong>📍</strong> {character.location}</p>}
                                                {character.occupation && <p className="text-gray-700 text-lg"><strong>💼</strong> {character.occupation}</p>}
                                                {character.personality && <p className="text-gray-700 text-lg"><strong>💭</strong> {character.personality}</p>}
                                                {character.lookingFor && (
                                                    <p className="text-gray-700 text-lg"><strong>🎯</strong> {character.lookingFor}</p>
                                                )}
                                            </div>
                                            
                                            <p className="text-gray-800 mb-6 italic text-lg leading-relaxed">"{character.description}"</p>
                                            
                                            {character.interests && (
                                                <div className="mb-6">
                                                    <p className="text-lg font-semibold text-gray-700 mb-3">Interests:</p>
                                                    <div className="flex flex-wrap gap-3">
                                                        {character.interests.map((interest, idx) => (
                                                            <span key={idx} className="bg-pink-100 text-pink-800 px-3 py-2 rounded-full text-sm font-medium">
                                                                {interest}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <button
                                                onClick={() => startChatWith(key)}
                                                className={`w-full py-4 rounded-xl font-medium transition-all transform hover:scale-105 text-lg ${
                                                    key === 'support' 
                                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700'
                                                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                                                }`}
                                            >
                                                {key === 'support' ? '🆘 Chat with Support' : `💬 Start Chatting with ${character.name}`}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-center py-8 text-gray-500">
                            ChatCharacters - Universal Character Chat Platform
                        </div>
                    </div>
                );
            }

            // Chat View
            const character = characters[selectedCharacter];
            
            return (
                <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
                    <div className="max-w-4xl mx-auto p-4">
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={() => setCurrentView('profiles')}
                                className="bg-white/80 hover:bg-white px-4 py-2 rounded-lg shadow-sm transition-colors"
                            >
                                ← Back to Profiles
                            </button>
                            
                            <div className="bg-white/90 px-4 py-2 rounded-lg shadow-sm">
                                <span className="text-sm font-medium">🪙 Tokens: {userCredits}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg">
                            <div className="p-6 gradient-bg text-white rounded-t-xl">
                                <div className="flex items-center gap-4">
                                    <img 
                                        src={getCurrentPhoto(character, selectedCharacter)} 
                                        alt={character.name}
                                        className="w-16 h-16 rounded-full border-4 border-white/30"
                                    />
                                    <div>
                                        <h2 className="text-2xl font-bold">{character.name}{character.age ? `, ${character.age}` : ''}</h2>
                                        <p className="opacity-90">{character.description}</p>
                                        <p className="text-sm opacity-75">
                                            {character.location && `📍 ${character.location}`}
                                            {character.location && character.occupation && ' • '}
                                            {character.occupation && `💼 ${character.occupation}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-96 overflow-y-auto p-6 space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        <div className="text-4xl mb-4">{character.avatar || '💕'}</div>
                                        <p className="text-lg font-medium">Say hello to {character.name}!</p>
                                        <p className="text-sm mt-2">Ready to start a conversation</p>
                                    </div>
                                )}
                                
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md p-4 rounded-lg ${
                                            msg.sender === 'You' 
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                                                : msg.error
                                                    ? 'bg-red-50 border border-red-200 text-red-800'
                                                    : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            <div className="font-medium text-sm mb-1">{msg.sender}</div>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 p-4 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t">
                                <div className="flex gap-3">
                                    <textarea
                                        value={userMessage}
                                        onChange={(e) => setUserMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={`Send a message to ${character.name}...`}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows="2"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!userMessage.trim() || isLoading}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        💬 Send
                                    </button>
                                </div>
                                
                                <div className="text-xs text-gray-500 mt-2 text-center">
                                    💕 Photos: 1 token ($0.50) • 💬 Chatting: 10 tokens/hour ($5.00)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.render(<ChatCharacters />, document.getElementById('root'));
    </script>
</body>
</html>