#!/bin/bash

# Start the backend server and frontend dev server concurrently

# Start backend in background
node server/index.js &
BACKEND_PID=$!

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Handle cleanup on exit
cleanup() {
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
