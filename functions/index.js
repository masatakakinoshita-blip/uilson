// Firebase Cloud Functions v2 - UILSON API
// Each Vercel serverless function is wrapped as a Cloud Function

import { onRequest } from 'firebase-functions/v2/https';

// Import all handlers (same code as Vercel api/ directory)
import chatHandler from './api/chat.js';
import cronHandler from './api/cron.js';
import generateSkillHandler from './api/generate-skill.js';
import generateSlidesHandler from './api/generate-slides.js';
import googleOauthHandler from './api/google-oauth.js';
import googleRefreshHandler from './api/google-refresh.js';
import msOauthHandler from './api/ms-oauth.js';
import parseTemplateHandler from './api/parse-template.js';
import skillsHandler from './api/skills.js';
import slackMessagesHandler from './api/slack-messages.js';
import slackOauthHandler from './api/slack-oauth.js';
import slackUserinfoHandler from './api/slack-userinfo.js';
import zoomOauthHandler from './api/zoom-oauth.js';
import zoomMeetingsHandler from './api/zoom-meetings.js';

// Shared Cloud Function options
const opts = {
  region: 'asia-northeast1',  // Tokyo region for low latency
  cors: true,
};

// Long-running function options (for AI chat which can take time)
const longOpts = {
  ...opts,
  memory: '512MiB',
  timeoutSeconds: 300,  // 5 minutes for complex AI tool chains
};

// Standard function options
const stdOpts = {
  ...opts,
  memory: '256MiB',
  timeoutSeconds: 60,
};

// Export Cloud Functions
export const chat = onRequest(longOpts, chatHandler);
export const cron = onRequest(stdOpts, cronHandler);
export const generateskill = onRequest(stdOpts, generateSkillHandler);
export const generateslides = onRequest(longOpts, generateSlidesHandler);
export const googleoauth = onRequest(stdOpts, googleOauthHandler);
export const googlerefresh = onRequest(stdOpts, googleRefreshHandler);
export const msoauth = onRequest(stdOpts, msOauthHandler);
export const parsetemplate = onRequest(stdOpts, parseTemplateHandler);
export const skills = onRequest(stdOpts, skillsHandler);
export const slackmessages = onRequest(stdOpts, slackMessagesHandler);
export const slackoauth = onRequest(stdOpts, slackOauthHandler);
export const slackuserinfo = onRequest(stdOpts, slackUserinfoHandler);
export const zoomoauth = onRequest(stdOpts, zoomOauthHandler);
export const zoommeetings = onRequest(stdOpts, zoomMeetingsHandler);
