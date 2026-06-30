const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/life-manager';

app.use(cors({ origin: ['http://localhost:3002', 'http://127.0.0.1:3002', 'https://lifemanager26.netlify.app', process.env.FRONTEND_URL].filter(Boolean) }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/people', require('./routes/people'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/health', require('./routes/health'));

// Server ping
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Backend health check API
app.get('/api/healthcheck', (req, res) => res.status(200).json({ status: 'ok', health: 'ok' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', health: 'ok' }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected to', MONGO_URI);
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Server running on http://localhost:' + PORT);
      console.log('   Press Ctrl+C to stop.');
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Make sure MongoDB is running: mongod --dbpath C:\\data\\db');
    process.exit(1);
  });