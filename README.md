# Gold Price Tracker

## Useful Commands

Here are some helpful commands and scripts to manage the local development environment.

### Managing Ports (Kill hanging processes)

Sometimes a server might crash or get suspended without freeing up the port it was using. This leads to `EADDRINUSE` errors when you try to start it again.

You can use the built-in scripts from the root directory to free up these ports:

```bash
# To kill any process stuck on port 3000 (Backend)
npm run kill:backend
# or
yarn kill:backend

# To kill any process stuck on port 4200 (Frontend)
npm run kill:frontend
# or
yarn kill:frontend
```

Alternatively, you can manually run these commands on macOS:

```bash
# Find what's running on port 3000
lsof -i :3000

# Kill it directly (Replace 3000 with any port)
lsof -ti:3000 | xargs kill -9
# or
npx kill-port 3000
```

### Running the App Locally

To start the backend (Port 3000):
```bash
cd backend
yarn start
# or yarn dev (for auto-restart on changes)
```

To start the frontend (Port 4200):
```bash
cd frontend
ng serve
```
