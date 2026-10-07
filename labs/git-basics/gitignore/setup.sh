git init -q proj
cd proj
echo "# Demo Project" > README.md
echo "PORT=3000" > config.local
git add README.md config.local
git commit -q -m "Initial commit"
echo "console.log('App running');" > app.js
echo "2026-10-07 error: connection timeout" > debug.log
echo "DATABASE_URL=postgres://localhost/db" > .env
mkdir -p tmp
echo "cache data" > tmp/cache.txt