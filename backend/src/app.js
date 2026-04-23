require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes      = require('./routes/auth');
const goldRoutes      = require('./routes/gold');
const portfolioRoutes = require('./routes/portfolio');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/gold',      goldRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Serve Angular frontend in production (only when NOT deployed to Vercel separately)
if (!process.env.VERCEL) {
  const distPath = process.env.FRONTEND_DIST
    ? path.resolve(process.env.FRONTEND_DIST)
    : path.join(__dirname, '../../frontend/dist/frontend/browser');

  if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// ─── Export for Vercel Serverless ───────────────────────────────────────────
// Vercel imports this file and uses `module.exports` as the request handler.
// The `api/index.js` wrapper handles DB initialization before calling this.
module.exports = app;

// ─── Local Dev: start Express server directly ────────────────────────────────
// `require.main === module` is true only when run via `node src/app.js` directly,
// NOT when imported by `api/index.js` or tests.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const { startScheduler } = require('./services/scheduler');
  const { initSchema }     = require('./db/database');

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
}
