/* ============================================================================
 * Where the API is, decided at run time (public/config.js) so one build can
 * be deployed to any environment, with the build-time env var as fallback.
 *
 *   LIVE    — talk to nasou-api: every list and every change goes to the
 *             server, nothing business-related is kept in the browser.
 *   IS_MOCK — no API configured (the Vercel demo): the stores in src/store run
 *             the marketplace in localStorage.
 * ==========================================================================*/

const runtime = (typeof window !== 'undefined' && window.__NIVORA__) || {};
const env = import.meta.env || {}; // undefined outside Vite (node tests)
const fromEnv = env.VITE_API_BASE_URL;

export const API_BASE_URL = String(runtime.apiBaseUrl || fromEnv || '').replace(/\/+$/, '');
export const IS_MOCK = !API_BASE_URL || (!runtime.apiBaseUrl && env.VITE_MOCK_API === 'true');
export const LIVE = !IS_MOCK;

/* Show the demo sign-in list (test accounts, 2FA code). Always in the browser
   demo; on a real server only where config.js says so (dev / staging). */
export const SHOW_DEMO = IS_MOCK || runtime.demo === true;
