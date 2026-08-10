#!/bin/sh
set -e

# Generate runtime environment config
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}",
  VITE_ENABLE_BACKEND_API: "${VITE_ENABLE_BACKEND_API}"
};
EOF

echo "Runtime environment variables injected:"
cat /usr/share/nginx/html/env-config.js

# Start nginx
exec nginx -g 'daemon off;'

