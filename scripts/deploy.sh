#!/usr/bin/env bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ACTION="${1:-status}"

case "$ACTION" in
  build)
    echo "Building standalone application..."
    npm run build:standalone
    ;;
  start)
    echo "Starting PM2 service..."
    npx pm2 start ecosystem.config.cjs --env production
    npx pm2 save
    ;;
  stop)
    npx pm2 stop ecosystem.config.cjs
    ;;
  restart)
    npx pm2 restart ecosystem.config.cjs
    ;;
  reload)
    npx pm2 reload ecosystem.config.cjs
    ;;
  status)
    npx pm2 status
    ;;
  logs)
    npx pm2 logs family-stream
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh {build|start|stop|restart|reload|status|logs}"
    exit 1
    ;;
esac
