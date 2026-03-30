#!/bin/bash
# Remove vite.config.ts block (lines 1800-1959) and replace with stub
cd /home/ubuntu/meetup-travel

# Replace lines 1800-1959 with a stub that doesn't require dev dependencies
sed -i '1800,1959d' dist/index.js

# Insert stub at line 1800
sed -i '1799a\
// vite.config.ts (stubbed for production)\
var vite_config_exports = {};\
__export(vite_config_exports, {\
  default: () => vite_config_default\
});\
var vite_config_default = {};' dist/index.js

echo "Removed vite.config block from dist/index.js"
grep -c "@tailwindcss\|@vitejs\|vite-plugin-manus\|from \"vite\"" dist/index.js
