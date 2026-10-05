const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scaffold, addToTrackYaml, parseArgs } = require('../../scripts/new-lab');
const { loadCatalog } = require('../../src/loader');
const { loadRoadmap } = require('../../src/roadmap');

const REPO = path.join(__dirname, '..', '..');

// A throwaway repo root: the real template, one track with one lab, and a small roadmap.
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newlab-'));
  fs.cpSync(path.join(REPO, 'templates'), path.join(root, 'templates'), { recursive: true });
  const lab = path.join(root, 'labs', 'demo-track', 'first');
  fs.mkdirSync(path.join(lab, 'checks'), { recursive: true });
  fs.mkdirSync(path.join(lab, 'solutions'), { recursive: true });
  fs.writeFileSync(path.join(root, 'labs', 'demo-track', 'track.yaml'), '# order matters\ntitle: Demo track\ndescription: d\nlabs:\n  - first   # the first one\n');
  fs.writeFileSync(path.join(lab, 'lab.yaml'), 'title: First\nlevel: beginner\nminutes: 10\nsummary: s\nsteps:\n  - {id: a, type: lesson, title: A, body: hi}\n  - {id: b, type: task, title: B, body: do it, hint: nudge}\n');
  fs.writeFileSync(path.join(lab, 'checks', 'b.sh'), '. "$LAB_LIB"\n[ -f x ] || fail "no x"\n');
  fs.writeFileSync(path.join(lab, 'solutions', 'b.sh'), 'touch x\n');
  fs.cpSync(lab, path.join(root, 'labs', 'whole-track', 'solo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'labs', 'whole-track', 'track.yaml'), 'title: Whole\ndescription: d\nlabs:\n  - solo\n');
  fs.writeFileSync(path.join(root, 'labs', 'roadmap.json'), JSON.stringify({
    version: 1,
    domains: [{ id: 'devops', title: 'DevOps', tagline: 't', topics: [
      { id: 'demo', title: 'Demo', status: 'live', labs: ['demo-track/first'] },
      { id: 'soon', title: 'Soon', status: 'next' },
      { id: 'whole', title: 'Whole track', status: 'live', track: 'whole-track' },
    ] }],
  }, null, 2) + '\n');
  return root;
}
const problemsOf = (root) => {
  const catalog = loadCatalog(path.join(root, 'labs'));
  return [...catalog.problems, ...loadRoadmap(catalog, path.join(root, 'labs', 'roadmap.json')).problems];
};

test('scaffold creates the lab and registers it in track.yaml and on the roadmap, leaving no problems', () => {
  const root = fixture();
  const r = scaffold({ root, track: 'demo-track', lab: 'second', topic: 'demo', title: 'Second lab', level: 'intermediate', minutes: 12 });
  assert.equal(r.dryRun, false);
  const yaml = fs.readFileSync(path.join(root, 'labs', 'demo-track', 'second', 'lab.yaml'), 'utf8');
  assert.match(yaml, /^title: Second lab$/m);
  assert.match(yaml, /^level: intermediate/m);
  assert.match(yaml, /^minutes: 12/m);
  assert.match(fs.readFileSync(path.join(root, 'labs', 'demo-track', 'track.yaml'), 'utf8'), /- first {3}# the first one\n {2}- second\n/);   // comments kept
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8')).domains[0].topics[0].labs, ['demo-track/first', 'demo-track/second']);
  assert.deepEqual(problemsOf(root), []);
});

test('scaffold on a "next" topic makes it live; on a whole-track topic it only edits track.yaml; a new track is created', () => {
  const root = fixture();
  const r = scaffold({ root, track: 'demo-track', lab: 'third', topic: 'soon' });
  assert.ok(r.actions.some((a) => /now "live"/.test(a)));
  const topics = JSON.parse(fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8')).domains[0].topics;
  assert.equal(topics[1].status, 'live');
  assert.deepEqual(topics[1].labs, ['demo-track/third']);
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'x', topic: 'whole' }), /whole track "whole-track"/);
  const before = JSON.stringify(topics[2]);
  scaffold({ root, track: 'whole-track', lab: 'extra', topic: 'whole' });
  assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8')).domains[0].topics[2]), before);   // the topic already covers its track
  scaffold({ root, track: 'brand-new', lab: 'one', topic: 'demo' });
  assert.match(fs.readFileSync(path.join(root, 'labs', 'brand-new', 'track.yaml'), 'utf8'), /^title: Brand new\n/);
  assert.deepEqual(problemsOf(root), []);
});

test('scaffold refuses bad input and duplicates, lists topics for an unknown one, and dry-run writes nothing', () => {
  const root = fixture();
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'first', topic: 'demo' }), /already exists/);
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'Bad Id', topic: 'demo' }), /lowercase/);
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'ok', topic: 'nope' }), /Topics on the roadmap:\n\s+demo /);
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'ok', topic: 'demo', level: 'expert' }), /--level/);
  assert.throws(() => scaffold({ root, track: 'demo-track', lab: 'ok', topic: 'demo', minutes: 60 }), /--minutes/);
  const before = fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8');
  const r = scaffold({ root, track: 'demo-track', lab: 'ghost', topic: 'demo', dryRun: true });
  assert.equal(r.dryRun, true);
  assert.equal(fs.existsSync(path.join(root, 'labs', 'demo-track', 'ghost')), false);
  assert.equal(fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8'), before);
});

test('addToTrackYaml handles block and inline lists and is idempotent', () => {
  assert.equal(addToTrackYaml('title: t\nlabs:\n  - a\n  - b\nvideo:\n  title: v\n', 'c'), 'title: t\nlabs:\n  - a\n  - b\n  - c\nvideo:\n  title: v\n');
  assert.equal(addToTrackYaml('title: t\nlabs: [a, b]\n', 'c'), 'title: t\nlabs: [a, b, c]\n');
  assert.equal(addToTrackYaml('labs:\n  - a\n', 'a'), 'labs:\n  - a\n');
  assert.throws(() => addToTrackYaml('title: t\n', 'a'), /no labs/);
});

test('the shipped roadmap.json round-trips byte for byte, so the scaffold only ever changes what it means to', () => {
  const file = path.join(REPO, 'labs', 'roadmap.json');
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(JSON.stringify(JSON.parse(text), null, 2) + '\n', text);
});

test('parseArgs reads flags and keeps the title words', () => {
  const o = parseArgs(['t', 'l', '--topic', 'linux', 'My', 'title', '--dry-run', '--minutes', '8']);
  assert.deepEqual([o.positional, o.topic, o.dryRun, o.minutes], [['t', 'l', 'My', 'title'], 'linux', true, '8']);
  assert.throws(() => parseArgs(['--wat']), /unknown option/);
});
