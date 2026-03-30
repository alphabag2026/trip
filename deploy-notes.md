# Deploy Notes - v10.8 to Vultr

## Server
- IP: 141.164.50.51
- Container: alpha-trip (healthy)
- Port: 3005 → 3000
- Domain: alphatrip.org (SSL via Let's Encrypt)

## Deploy Status
- HTTP 200 OK
- Container healthy
- All pages loading correctly
- Non-logged-in user sees: TRY SERVICES (Apply, Lookup, Schedule, Community) + EXPLORE MORE (Ride, Delivery, AI Helper, Map)

## Notes
- OAuth not configured on production (OAUTH_SERVER_URL missing) - login via Manus OAuth won't work on production
- Dev-only vite plugins removed from dist/index.js (@builder.io, @tailwindcss/vite, @vitejs/plugin-react, vite-plugin-manus-runtime)
