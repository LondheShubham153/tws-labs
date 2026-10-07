mkdir -p shop/.github/workflows shop/src shop/test
printf 'console.log("shop is up");\n' > shop/src/app.js
cat > shop/package.json <<'JSON'
{
  "name": "shop",
  "version": "1.0.0",
  "scripts": {
    "build": "mkdir -p dist && cp src/* dist/",
    "test": "node test/app.test.js"
  }
}
JSON
cat > shop/package-lock.json <<'JSON'
{
  "name": "shop",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "packages": {}
}
JSON
cat > shop/test/app.test.js <<'JS'
const fs = require('fs');
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/report.xml', '<testsuite name="shop" tests="1" failures="0"></testsuite>');
console.log("all tests passed");
JS
cat > shop/.github/workflows/ci.yml <<'YML'
name: CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
YML
