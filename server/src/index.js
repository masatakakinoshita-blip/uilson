// UILSON Cloud Run API Server
// Persistent Express server with DB pool, Pub/Sub, LLM abstraction
import express from 'express';
import cors from 'cors';
import { initFirebase } from './services/firebase.js';
import { initDB } from './services/db.js';
import { initPubSub } from './services/pubsub.js';
import chatRouter from './routes/chat.js';
import memoryRouter from './routes/memory.js';
import suggestRouter from './routes/suggest.js';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize services on startup (persistent connections - Cloud Run advantage)
let services = {};

async function initServices() {
  console.log('[UILSON] Initializing services...');

  services.firebase = initFirebase();
  services.db = await initDB();
  services.pubsub = initPubSub();

  console.log('[UILSON] All services initialized');
  return services;
}

// Inject services into request
app.use((req, res, next) => {
  req.services = services;
  next();
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/suggest', suggestRouter);

// Start
initServices().then(() => {
  app.listen(PORT, () => {
    console.log(`[UILSON] Cloud Run server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('[UILSON] Failed to initialize:', err);
  process.exit(1);
});
