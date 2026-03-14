// UILSON Cloud Run API Server
// Persistent Express server with DB pool, Pub/Sub, LLM abstraction
// Now also serves all API endpoints (migrated from Cloud Functions)
import express from 'express';
import cors from 'cors';
import { initFirebase } from './services/firebase.js';
import { initDB } from './services/db.js';
import { initPubSub } from './services/pubsub.js';
import chatRouter from './routes/chat.js';
import memoryRouter from './routes/memory.js';
import suggestRouter from './routes/suggest.js';
import healthRouter from './routes/health.js';

// API handlers (migrated from Cloud Functions)
import slackOauthHandler from './api/slack-oauth.js';
import slackMessagesHandler from './api/slack-messages.js';
import slackUserinfoHandler from './api/slack-userinfo.js';
import googleOauthHandler from './api/google-oauth.js';
import googleRefreshHandler from './api/google-refresh.js';
import msOauthHandler from './api/ms-oauth.js';
import zoomOauthHandler from './api/zoom-oauth.js';
import zoomMeetingsHandler from './api/zoom-meetings.js';
import skillsHandler from './api/skills.js';
import generateSkillHandler from './api/generate-skill.js';
import generateSlidesHandler from './api/generate-slides.js';
import parseTemplateHandler from './api/parse-template.js';
import cronHandler from './api/cron.js';

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

// Core routes (with Express Router)
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/suggest', suggestRouter);

// API handler routes (simple req/res handlers from Cloud Functions)
// These use GET query params, so mount on both GET and POST
app.all('/api/slack-oauth', slackOauthHandler);
app.all('/api/slack-messages', slackMessagesHandler);
app.all('/api/slack-userinfo', slackUserinfoHandler);
app.all('/api/google-oauth', googleOauthHandler);
app.all('/api/google-refresh', googleRefreshHandler);
app.all('/api/ms-oauth', msOauthHandler);
app.all('/api/zoom-oauth', zoomOauthHandler);
app.all('/api/zoom-meetings', zoomMeetingsHandler);
app.all('/api/skills', skillsHandler);
app.all('/api/generate-skill', generateSkillHandler);
app.all('/api/generate-slides', generateSlidesHandler);
app.all('/api/parse-template', parseTemplateHandler);
app.all('/api/cron', cronHandler);

// Start
initServices().then(() => {
  app.listen(PORT, () => {
    console.log(`[UILSON] Cloud Run server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('[UILSON] Failed to initialize:', err);
  process.exit(1);
});
