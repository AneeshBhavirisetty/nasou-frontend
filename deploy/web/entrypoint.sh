#!/bin/sh
# Writes the runtime settings the app reads before it starts (see
# public/config.js). nginx's own entrypoint runs this on every start.
set -e
api="${API_BASE_URL:-}"
demo="false"
[ "${SHOW_DEMO:-false}" = "true" ] && demo="true"
cat > /usr/share/nginx/html/config.js <<CONFIG
window.__NIVORA__ = { apiBaseUrl: '${api}', demo: ${demo} };
CONFIG
echo "nivora: API ${api:-<none: browser demo>}, demo accounts ${demo}"
