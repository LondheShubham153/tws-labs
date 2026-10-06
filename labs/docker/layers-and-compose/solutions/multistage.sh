printf 'FROM node:22-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN npm ci\n\nFROM node:22-alpine\nWORKDIR /app\nCOPY --from=build /app/server.js .\nUSER node\nCMD ["node", "server.js"]\n' > Dockerfile
