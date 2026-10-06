const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { compute, render, apply } = require('../../scripts/readme-stats');

const README = path.join(__dirname, '..', '..', 'README.md');

// The image ships no README, so this only runs in a checkout (and in CI).
test('the README badges, pitch and route table match the real catalog (run `npm run readme:stats` after adding a lab)', { skip: !fs.existsSync(README) }, () => {
  const readme = fs.readFileSync(README, 'utf8');
  const s = compute();
  assert.deepEqual([...s.catalog.problems, ...s.roadmap.problems], []);
  assert.equal(apply(readme, render(s)), readme, 'README.md is stale: run `npm run readme:stats`');
});

test('apply() fails loudly when a marker is missing instead of silently skipping it', () => {
  assert.throws(() => apply('# no markers here', { badges: '', pitch: '', table: '' }), /markers/);
});
