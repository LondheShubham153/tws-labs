# Seeds a realistic, friendly project workspace for the learner.
cat > config.sample << 'EOF'
PORT=8080
ENVIRONMENT=development
LOG_LEVEL=info
EOF

cat > api.key << 'EOF'
secret-token-live-xyz-98765
EOF
chmod 644 api.key

cat > service.log << 'EOF'
2026-10-01 08:00:00 INFO initializing service components
2026-10-01 08:00:01 ERROR failed to connect to cache service
2026-10-01 08:00:02 INFO loaded fallback in-memory cache
2026-10-01 08:00:05 ERROR invalid timeout setting in legacy config
2026-10-01 08:00:06 INFO service ready for traffic
EOF

cat > start.sh << 'EOF'
#!/bin/bash
set -e
echo "Starting application service..."
if [ ! -d logs ]; then
  echo "Error: logs/ directory missing" >&2
  exit 1
fi
if [ ! -f config.env ]; then
  echo "Error: config.env missing" >&2
  exit 1
fi
echo "ONLINE $(date +%s)" > .service_status
echo "Service is running successfully!"
EOF
chmod 644 start.sh
rm -f .service_status
