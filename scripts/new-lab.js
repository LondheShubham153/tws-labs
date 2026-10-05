#!/usr/bin/env node
// Scaffold a lab AND register it, so a lab PR touches only labs/**:
//   npm run lab:new -- <track> <lab-id> --topic <topic-id> ["Lab title"] [--level beginner] [--minutes 10] [--dry-run]
// It copies templates/lab/, adds the lab to labs/<track>/track.yaml and to its roadmap topic in
// labs/roadmap.json (the home map and Roadmap page are built from that file), and says what is left to do.
// No dependencies: it runs with plain Node on the host.
const fs = require('fs');
const path = require('path');

const ID_RE = /^[a-z0-9][a-z0-9-]{0,48}$/;   // keep in sync with src/loader.js
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function topicsOf(roadmap) {
  const out = [];
  for (const d of roadmap.domains || []) for (const t of d.topics || []) out.push({ domain: d.title, topic: t });
  return out;
}

function topicList(roadmap) {
  return topicsOf(roadmap).map(({ domain, topic }) => `  ${topic.id.padEnd(22)} ${domain} (${topic.status})`).join('\n');
}

// Insert `lab` at the end of the `labs:` list of a track.yaml, keeping comments and the list's style.
function addToTrackYaml(text, lab) {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => /^labs:/.test(l));
  if (at === -1) throw new Error('track.yaml has no labs: list');
  const inline = lines[at].match(/^labs:\s*\[(.*)\]\s*$/);
  if (inline) {
    const items = inline[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (items.includes(lab)) return text;
    lines[at] = `labs: [${[...items, lab].join(', ')}]`;
    return lines.join('\n');
  }
  let last = at;
  let indent = '  ';
  for (let i = at + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(\s+)-\s+(\S+)/);
    if (!m) break;
    if (m[2] === lab) return text;
    last = i;
    indent = m[1];
  }
  lines.splice(last + 1, 0, `${indent}- ${lab}`);
  return lines.join('\n');
}

function scaffold({ root, track, lab, topic, title, level = 'beginner', minutes = 10, dryRun = false }) {
  if (!ID_RE.test(track || '') || !ID_RE.test(lab || '')) throw new Error('track and lab ids use lowercase letters, digits and dashes');
  if (!LEVELS.includes(level)) throw new Error(`--level must be one of ${LEVELS.join(', ')}`);
  if (!(Number(minutes) >= 5 && Number(minutes) <= 20)) throw new Error('--minutes must be between 5 and 20');
  const labsDir = path.join(root, 'labs');
  const roadmapFile = path.join(labsDir, 'roadmap.json');
  const roadmap = JSON.parse(fs.readFileSync(roadmapFile, 'utf8'));
  const found = topicsOf(roadmap).find((x) => x.topic.id === topic);
  if (!found) throw new Error(`unknown topic "${topic}". Topics on the roadmap:\n${topicList(roadmap)}`);
  const t = found.topic;
  if (t.track !== undefined && t.track !== track) {
    throw new Error(`topic "${topic}" is built from the whole track "${t.track}". Put the lab in that track, or pick another topic.`);
  }

  const dest = path.join(labsDir, track, lab);
  if (fs.existsSync(dest)) throw new Error(`${path.relative(root, dest)} already exists`);
  const key = `${track}/${lab}`;
  const labTitle = title || lab.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const actions = [];

  const trackFile = path.join(labsDir, track, 'track.yaml');
  const trackExists = fs.existsSync(trackFile);
  const newTrack = `title: ${track.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())}\ndescription: TODO describe this track\nlabs:\n  - ${lab}\n`;
  const nextTrack = trackExists ? addToTrackYaml(fs.readFileSync(trackFile, 'utf8'), lab) : newTrack;
  actions.push(trackExists ? `added "${lab}" to labs/${track}/track.yaml` : `created labs/${track}/track.yaml (fix its title and description)`);

  if (t.track === undefined) {
    t.labs = Array.isArray(t.labs) ? t.labs : [];
    if (!t.labs.includes(key)) t.labs.push(key);
    actions.push(`added "${key}" to roadmap topic "${topic}"`);
    if (t.status !== 'live') { actions.push(`topic "${topic}" was "${t.status}" and is now "live" (a topic with labs must be live)`); t.status = 'live'; }
  } else {
    actions.push(`roadmap topic "${topic}" already covers every lab in "${track}"`);
  }
  actions.push(`created labs/${key}/ from templates/lab/`);
  if (dryRun) return { actions, dryRun: true };

  const copy = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
      const f = path.join(from, ent.name);
      const target = path.join(to, ent.name);
      if (ent.isDirectory()) { copy(f, target); continue; }
      let body = fs.readFileSync(f, 'utf8').replace(/__TITLE__/g, labTitle);
      if (ent.name === 'lab.yaml') body = body.replace(/^level: \w+/m, `level: ${level}`).replace(/^minutes: \d+/m, `minutes: ${Number(minutes)}`);
      fs.writeFileSync(target, body);
      if (ent.name.endsWith('.sh')) fs.chmodSync(target, 0o644);
    }
  };
  copy(path.join(root, 'templates', 'lab'), dest);
  fs.mkdirSync(path.dirname(trackFile), { recursive: true });
  fs.writeFileSync(trackFile, nextTrack);
  fs.writeFileSync(roadmapFile, JSON.stringify(roadmap, null, 2) + '\n');
  return { actions, dryRun: false };
}

function parseArgs(argv) {
  const opts = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--topic' || a === '--level' || a === '--minutes') opts[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts.positional.push(a);
  }
  return opts;
}

if (require.main === module) {
  const usage = 'usage: npm run lab:new -- <track> <lab-id> --topic <topic-id> ["Lab title"] [--level beginner] [--minutes 10] [--dry-run]';
  const root = path.join(__dirname, '..');
  try {
    const o = parseArgs(process.argv.slice(2));
    const [track, lab, ...titleParts] = o.positional;
    // Always show the topics when something is missing: --topic says where learners find the lab.
    if (!track || !lab || !o.topic) {
      const roadmap = JSON.parse(fs.readFileSync(path.join(root, 'labs', 'roadmap.json'), 'utf8'));
      throw new Error(`${usage}\n\n--topic says where learners find the lab. Topics on the roadmap:\n${topicList(roadmap)}`);
    }
    const r = scaffold({ root, track, lab, topic: o.topic, title: titleParts.join(' '), level: o.level, minutes: o.minutes, dryRun: o.dryRun });
    console.log(`${r.dryRun ? 'would do' : 'done'}:\n${r.actions.map((a) => `  - ${a}`).join('\n')}`);
    if (!r.dryRun) console.log(`\nnext: edit labs/${track}/${lab}/lab.yaml, then write checks/ and solutions/ for your tasks.\n  The template ships two sample tasks (create-file, list-files): replace them and delete their checks/solutions files.\n  Then run: npm run lab:check -- ${track}/${lab}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { scaffold, addToTrackYaml, parseArgs, topicList };
