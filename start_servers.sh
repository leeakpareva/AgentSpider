#!/bin/bash

# Pi Dashboard Startup Script
echo "Starting Pi Dashboard servers..."

# Kill any existing servers on these ports
echo "Cleaning up existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Start backend server in background
echo "Starting backend server on port 3001..."
nohup node server.js > backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend dev server in background
echo "Starting frontend server on port 5173..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for servers to start
sleep 3

echo "Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access points:"
echo "- Frontend: http://localhost:5173"
echo "- Frontend (network): http://$(hostname -I | awk '{print $1}'):5173"
echo "- Backend API: http://localhost:3001"
echo ""
echo "Logs:"
echo "- Backend: tail -f backend.log"
echo "- Frontend: tail -f frontend.log"
echo ""
echo "To stop servers: pkill -f 'node server.js' && pkill -f 'vite'"