#!/usr/bin/env bash
set -e

trap 'kill 0' EXIT

echo "Starting backend on http://localhost:5055 ..."
(cd backend/src/MyStb.Api && dotnet run) &

echo "Starting frontend on http://localhost:5173 ..."
(cd frontend && VITE_API_URL=http://localhost:5055 npm run dev) &

wait
