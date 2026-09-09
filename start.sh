#!/usr/bin/env bash
set -e

PORT="${PORT:-9000}"
PID=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true)

if [ -n "$PID" ]; then
  echo "Puerto $PORT ocupado por PID: $PID. Matando..."
  kill -9 "$PID" 2>/dev/null || true
  sleep 1
  echo "Proceso terminado."
fi

cd "$(dirname "$0")"
if [ ! -f ./revista-server ]; then
  echo "Build no encontrado. Compilando..."
  (cd backend && go build -o ../revista-server .)
fi

echo "Arrancando servidor en el puerto $PORT..."
exec ./revista-server
