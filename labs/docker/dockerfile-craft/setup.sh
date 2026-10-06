mkdir -p app/node_modules
printf '{\n  "name": "sample",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": { "start": "node server.js" }\n}\n' > app/package.json
printf '{\n  "name": "sample",\n  "version": "1.0.0",\n  "lockfileVersion": 3,\n  "requires": true,\n  "packages": { "": { "name": "sample", "version": "1.0.0" } }\n}\n' > app/package-lock.json
printf 'const http = require("http");\nhttp.createServer((req, res) => res.end("Hello from a container\\n")).listen(3000);\n' > app/server.js
printf 'local copy, not for the image\n' > app/node_modules/README
