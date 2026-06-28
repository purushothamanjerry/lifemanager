const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();
const PORT      = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set!');
  process.exit(1);
}

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3002']
  : ['http://localhost:3002', 'http://127.0.0.1:3002'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/people',        require('./routes/people'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/notes',         require('./routes/notes'));
app.use('/api/memories',      require('./routes/memories'));
app.use('/api/plans',         require('./routes/plans'));
app.use('/api/finance',       require('./routes/finance'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/activities',    require('./routes/activities'));
app.use('/api/health',        require('./routes/health'));

// Server ping / health check (Render uses this to confirm app is up)
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
