#!/usr/bin/env node
// The one command to run before opening a lab PR:  npm run lab:check [track/lab]
// 1. static checks (any OS, instant)   2. the proof: every check fails before its solution and passes after
// (step 2 runs in Docker on macOS and Windows). CI runs the same two steps.
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2).filter((a) => a !== '--strict');
const run = (script, extra) => spawnSync(process.execPath, [path.join(__dirname, script), ...extra, ...args], { stdio: 'inherit' }).status;

if (run('lint-labs.js', ['--strict'])) process.exit(1);
console.log('\nstatic checks passed - now proving every task is solvable...\n');
process.exit(run('validate-labs.js', ['--strict']) ? 1 : 0);
