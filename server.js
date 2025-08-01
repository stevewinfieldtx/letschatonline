const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Minimal middleware
app.use(express.json());

// Health check - FIRST route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'LetsChat Online - Minimal Test', status: 'running' });
});

// Start server - bind to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal LetsChat server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});