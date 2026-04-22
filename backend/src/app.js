require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes      = require('./routes/auth');
const goldRoutes      = require('./routes/gold');
const portfolioRoutes = require('./routes/portfolio');
const { startScheduler } = require('./services/scheduler');
const { initSchema }     = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/gold',      goldRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Serve Angular frontend in production
const distPath = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.join(__dirname, '../../frontend/dist/frontend/browser');

if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Bootstrap: init DB schema then start server
async function main() {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`Gold Price server running on port ${PORT}`);
      startScheduler();
    });
  } catch (err) {
    console.error('[Startup] Failed to initialize DB schema:', err.message);
    process.exit(1);
  }
}

main();
