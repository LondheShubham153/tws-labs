mkdir -p shop/.github/workflows
printf 'console.log("shop is up");\n' > shop/app.js
printf '{\n  "name": "shop",\n  "scripts": { "test": "node app.js" }\n}\n' > shop/package.json
