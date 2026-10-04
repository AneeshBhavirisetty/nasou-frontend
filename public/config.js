/* Runtime settings, read before the app starts. The build is the same in
   every environment; the server that hosts it rewrites this file:
     docker  — nginx entrypoint, from API_BASE_URL (deploy/web/entrypoint.sh)
     Azure   — the deploy workflow, from the API's URL
   Empty means "use the build-time VITE_API_BASE_URL", and no URL at all
   runs the built-in demo backend in the browser. */
window.__NIVORA__ = window.__NIVORA__ || {
  apiBaseUrl: '',
};
