mkdir -p shop/.github/workflows
printf 'console.log("shop is up");\n' > shop/app.js
printf '{\n  "name": "shop",\n  "scripts": { "test": "node app.js" }\n}\n' > shop/package.json
cat > shop/.github/workflows/ci.yml <<'YML'
name: CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
YML
cat > shop/.github/workflows/broken.yml <<'YML'
name: Release
on:
  push:
    branches: [main]
permissions: write-all
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: acme/deploy@main
      - run: echo "releasing with ${{ secrets.DEPLOY_TOKEN }}"
YML
