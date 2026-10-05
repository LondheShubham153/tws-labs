// HTTP-level behaviour. No pty needed, so these run anywhere (laptop or CI).
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get, post, mint, check, WebSocket, LABS } = require('./helpers');
const { assertBrandedPage } = require('../assert-branded');
const { loadCatalog } = require('../../src/loader');

const EB = ['aws', 'elastic-beanstalk-cluster-mode'];

test('home shows the three routes in order; track pages list their labs; unknown paths 404', async () => {
  const app = await start();
  try {
    const home = (await get(app, '/')).body;
    const at = (name) => home.indexOf(`<h3>${name}</h3>`);
    assert.ok(at('DevOps') > 0 && at('DevOps') < at('Cloud') && at('Cloud') < at('AI'), 'routes appear in order');
    for (const t of ['Linux', 'Shell scripting', 'Git and GitHub', 'Elastic Beanstalk Cluster Mode', 'Docker', 'Kubernetes', 'Python for DevOps']) assert.match(home, new RegExp(t));
    assert.match((await get(app, '/t/git-basics')).body, /Your first commit/);
    assert.match((await get(app, '/t/aws')).body, /Elastic Beanstalk Cluster Mode/);
    for (const p of ['/t/nope', '/lab/git-basics/nope', '/lab/nope/nope', '/../../etc/passwd', '/random']) assert.equal((await get(app, p)).status, 404, p);
    assert.equal((await get(app, '/healthz')).body, 'ok');
    assert.match((await get(app, '/nope')).body, /Off course\./);
  } finally { app.stop(); }
});

test('every page has the shared chrome in both profiles: header, one rocket sprite, favicon, only the hosted app loads web fonts', async () => {
  for (const profile of ['hosted', 'local']) {
    const app = await start({ profile });
    try {
      const pages = [['/', 'Labs'], ['/t/git-basics', 'Labs'], ['/lab/' + EB.join('/'), 'Labs'], ['/videos', 'Videos'], ['/roadmap', 'Roadmap'], ['/nope', 'Labs']];
      for (const [url, active] of pages) {
        const html = (await get(app, url)).body;
        assertBrandedPage(html, active, `${profile} ${url}`);
        assert.equal((html.match(/<symbol id="rocket"/g) || []).length, 1, `${url}: one rocket sprite`);
        assert.match(html, /<link rel="icon"/);
      }
      assert.match((await get(app, '/')).body, new RegExp(`class="mono chip-env"[^>]*>${profile === 'local' ? 'local' : 'cluster'}<`));
      const css = await get(app, '/app.css');
      assert.equal(css.headers['content-type'], 'text/css');
      assert.equal(css.body.includes('googleapis'), profile === 'hosted');
      assert.equal((await get(app, '/logo/tws-labs-logo.png')).headers['content-type'], 'image/png');
      for (const f of ['/xterm/xterm.js', '/xterm/xterm.css', '/xterm/addon-fit.js', '/lab.js', '/progress.js', '/home.css', '/home.js', '/roadmap.css', '/roadmap.js']) assert.equal((await get(app, f)).status, 200, f);
    } finally { app.stop(); }
  }
});

test('home: a calm map - live topics link to labs, next topics are plain, later topics are off the page, nothing remote', async () => {
  const app = await start({ profile: 'local' });
  try {
    const html = (await get(app, '/')).body;
    assert.match(html, /<h1>Learn <span class="u line-devops">DevOps<\/span>, <span class="u line-cloud">Cloud<\/span> &amp; <span class="u line-ai">AI<\/span><br\/><em>by doing\.<\/em><\/h1>/);
    assert.match(html, /<svg viewBox="0 0 560 428" role="img" aria-label="Three orbits/);
    assert.deepEqual([...html.matchAll(/<div class="col line-(\w+) reveal">/g)].map((m) => m[1]), ['devops', 'cloud', 'ai']);
    // live topics are links: one lab -> straight to it, several labs -> the track page
    for (const href of ['/t/linux-fundamentals', '/lab/linux-fundamentals/shell-scripting-basics', '/t/git-basics', '/lab/aws/elastic-beanstalk-cluster-mode']) assert.ok(html.includes(`<a href="${href}"`), href);
    // next topics are not links; later topics are not on the home page at all
    const dim = [...html.matchAll(/<li data-status="(next|building)" class="dim">(.*?)<\/li>/g)];
    assert.ok(dim.length >= 8 && dim.every((m) => !m[2].includes('<a ')));
    for (const hidden of ['Ansible', 'Jenkins', 'OpenTelemetry', 'Helm', 'AIOps']) assert.ok(!html.includes(hidden), `${hidden} stays on the roadmap page`);
    for (const col of html.split('<div class="col ').slice(1)) assert.ok((col.match(/<li data-status=/g) || []).length <= 6, 'each route keeps to six stations');
    assert.match(html, /6 more on the roadmap/);
    assert.match(html, /&#8644; Cloud/, 'an interchange is hinted');
    assert.match(html, /href="\/lab\/linux-fundamentals\/navigating"|href="\/t\/linux-fundamentals"/, 'the main call to action launches the first lab');
    for (const os of ['windows', 'macos', 'linux']) assert.match(html, new RegExp(`role="tab" id="tab-${os}"`));
    assert.match(html, /start_local_labs\.sh/);
    assert.match(html, /document\.documentElement\.classList\.add\("js"\)/);
    assert.ok(!/ on[a-z]+=/i.test(html), 'no inline event handlers');
    assert.ok(!/azure|splunk|jira/i.test(html));
    for (const f of ['/home.css', '/home.js', '/roadmap.css', '/roadmap.js']) {
      const a = await get(app, f);
      assert.ok(!/(?:@import|url\()\s*['"]?https?:/.test(a.body) && !/fetch\(|XMLHttpRequest|import\(/.test(a.body), `${f} loads nothing remote`);
    }
  } finally { app.stop(); }
});

test('a lab missing from the roadmap is flagged on the home page instead of silently vanishing', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'labs-'));
  fs.cpSync(path.join(__dirname, '..', '..', 'labs'), dir, { recursive: true });
  const rm = JSON.parse(fs.readFileSync(path.join(dir, 'roadmap.json'), 'utf8'));
  rm.domains[0].topics = rm.domains[0].topics.filter((t) => t.id !== 'git');
  fs.writeFileSync(path.join(dir, 'roadmap.json'), JSON.stringify(rm));
  const app = await start({ labsDir: dir });
  try {
    const html = (await get(app, '/')).body;
    assert.match(html, /class="warn"/);
    assert.match(html, /lab &quot;git-basics\/first-commit&quot; is not on the roadmap|lab "git-basics\/first-commit" is not on the roadmap/);
  } finally { app.stop(); }
});

test('the Linux track includes the shell scripting lab with five graded tasks', async () => {
  const app = await start();
  try {
    const lab = app.getCatalog().tracks.find((t) => t.id === 'linux-fundamentals').labs.find((l) => l.id === 'shell-scripting-basics');
    assert.ok(lab);
    assert.equal(lab.steps.filter((s) => s.type === 'task').length, 5);
  } finally { app.stop(); }
});

test('roadmap: every topic grouped by line, collapsed rows, filters, capstones, honest statuses; /upcoming redirects', async () => {
  const app = await start();
  try {
    const res = await get(app, '/roadmap');
    const html = res.body;
    assert.equal(res.status, 200);
    for (const id of ['devops', 'cloud', 'ai']) assert.match(html, new RegExp(`<section class="rm-domain line-${id}" id="${id}"`));
    // everything is on this page, including the "later" topics the home page leaves out
    for (const t of ['Linux', 'Shell scripting', 'Docker', 'Ansible', 'Jenkins', 'Prometheus and Grafana', 'Kubernetes', 'GitOps with ArgoCD', 'Building AI agents', 'AIOps', 'Local LLMs in containers']) assert.ok(html.includes(`<b>${t}</b>`), t);
    const statuses = (s) => (html.match(new RegExp(`<details class="topic" data-status="${s}"`, 'g')) || []).length;
    assert.deepEqual([statuses('live'), statuses('next') > 0, statuses('later') > 0], [4, true, true]);
    assert.equal((html.match(/<a class="open"/g) || []).length, 4, 'only live topics can be opened');
    assert.match(html, /<button type="button" data-f="all" aria-pressed="true">All<\/button>/);
    assert.match(html, /class="caps"/);
    assert.match(html, /Adapted from the DevOps Roadmap 2026/);
    assert.ok(!/azure|splunk|jira|slack/i.test(html));
    const old = await get(app, '/upcoming');
    assert.equal(old.status, 301);
    assert.equal(old.headers.location, '/roadmap');
  } finally { app.stop(); }
});

test('videos: grouped by line, safe links, "Practice" only where a lab is online; the track page carries its video and breadcrumb', async () => {
  const app = await start();
  try {
    const v = (await get(app, '/videos')).body;
    for (const id of ['e01GGTKmtpc', '9Xl1ZTk3BQw', 'vA5TTz6BXhY', '9bSbNNH4Nqw', 'W04brGNgxN4']) assert.ok(v.includes(id), id);
    assert.match(v, /rel="noopener noreferrer"/);
    assert.equal((v.match(/Practice &rarr;/g) || []).length, 3, 'Linux, Shell scripting and Git are online');
    assert.match(v, /<span class="tag">next<\/span>/);
    const track = (await get(app, '/t/linux-fundamentals')).body;
    assert.match(track, /<p class="crumb"><a href="\/">Labs<\/a><i>\/<\/i><a href="\/roadmap#devops">DevOps<\/a><i>\/<\/i><span>Linux Fundamentals<\/span><\/p>/);
    assert.match(track, /Watch first: Linux For DevOps In One Shot/);
    assert.equal((track.match(/<li data-status="live">/g) || []).length, loadCatalog(LABS).tracks.find((t) => t.id === 'linux-fundamentals').labs.length, 'every Linux lab is a station on the route (derived from the catalog, so adding a lab needs no test edit)');
    assert.match(track, /class="wrap track line-devops"/);
  } finally { app.stop(); }
});

test('the lab page carries its line, a breadcrumb, the progress route with the rocket, and the next lab to suggest', async () => {
  const app = await start();
  try {
    const html = (await get(app, '/lab/linux-fundamentals/navigating')).body;
    assert.match(html, /class="lab-shell line-devops"/);
    assert.match(html, /<a href="\/roadmap#devops">DevOps<\/a>/);
    assert.match(html, /<nav class="journey" id="journey"/);
    assert.match(html, /<span class="jrocket" aria-hidden="true"><svg class="rk /);
    const data = JSON.parse(html.match(/id="lab-data" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.deepEqual(data.next, { href: '/lab/linux-fundamentals/files', title: 'Creating and managing files' });
    const last = JSON.parse((await get(app, '/lab/aws/elastic-beanstalk-cluster-mode')).body.match(/id="lab-data" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.equal(last.next, null, 'nothing follows the last lab');
    assert.match((await get(app, '/lab/aws/elastic-beanstalk-cluster-mode')).body, /class="lab-shell line-cloud"/);
  } finally { app.stop(); }
});

test('the lab page is a seatless shell: loading it never consumes a seat, and carries no token or answers', async () => {
  const app = await start({ maxSessions: 1 });
  try {
    for (let i = 0; i < 5; i++) {
      const res = await get(app, '/lab/' + EB.join('/'));
      assert.equal(res.status, 200);
      assert.ok(!/"token"/.test(res.body) && !res.body.includes('solutions') && !res.body.includes('checks/'));
    }
    assert.equal(app.store.size(), 0);
    assert.equal((await mint(app, ...EB)).status, 200, 'the seat is still free after five page loads');
  } finally { app.stop(); }
});

test('local wording replaces hosted wording only in the local profile', async () => {
  const hostedApp = await start({ profile: 'hosted' });
  const localApp = await start({ profile: 'local' });
  try {
    const hosted = (await get(hostedApp, '/lab/' + EB.join('/'))).body;
    const local = (await get(localApp, '/lab/' + EB.join('/'))).body;
    // lab data is embedded as JSON with "<" escaped, so compare against that form
    const inside = 'is \\u003cstrong>inside\\u003c/strong> a Cluster Mode replica';
    const yours = 'on \\u003cstrong>your\\u003c/strong> machine';
    assert.ok(hosted.includes(inside) && !hosted.includes(yours));
    assert.ok(local.includes(yours) && !local.includes(inside));
  } finally { hostedApp.stop(); localApp.stop(); }
});

test('POST /session: mints for a real lab, rejects unknown labs and bad bodies', async () => {
  const app = await start();
  try {
    const ok = await mint(app, ...EB);
    assert.equal(ok.status, 200);
    assert.match(ok.json.token, /^[0-9a-f]{32}$/);
    assert.equal((await mint(app, 'aws', 'nope')).status, 404);
    assert.equal((await mint(app, '../..', 'x')).status, 404);
    assert.equal((await post(app, '/session', '{not json')).status, 400);
    assert.equal((await post(app, '/session', 'x'.repeat(5000))).status, 413);
  } finally { app.stop(); }
});

test('invite gate: every lab needs a configured token on hosted; the local app never asks', async () => {
  const hosted = await start({ profile: 'hosted', accessTokens: ['one', 'two'] });
  const closed = await start({ profile: 'hosted', accessTokens: [] });
  const local = await start({ profile: 'local' });
  const bare = (app, lab, headers) => post(app, '/session', { track: lab[0], lab: lab[1] }, { headers });
  const OPEN = ['linux-fundamentals', 'navigating'];
  try {
    assert.equal((await bare(hosted, EB)).status, 401);
    assert.equal((await bare(hosted, EB)).json.error, 'token-required');
    assert.equal((await bare(hosted, EB, { 'X-Lab-Token': 'nope' })).status, 401);
    assert.equal((await bare(hosted, EB, { 'X-Lab-Token': 'one' })).status, 200);
    assert.equal((await bare(hosted, EB, { 'X-Lab-Token': 'two' })).status, 200);
    assert.equal((await bare(hosted, OPEN)).status, 401);                     // every lab is gated, not just one
    assert.equal((await bare(hosted, OPEN, { 'X-Lab-Token': 'one' })).status, 200);
    assert.equal((await bare(closed, EB, { 'X-Lab-Token': '' })).status, 401); // no tokens configured: closed, not open
    assert.equal((await bare(local, EB)).status, 200);                         // local: no gate
    assert.equal((await bare(local, OPEN)).status, 200);
    assert.equal((await post(hosted, '/session', { track: EB[0], lab: EB[1] }, { headers: { 'X-Lab-Token': 'one' }, origin: 'http://evil.example' })).status, 403);   // guards still first
    assert.match((await get(hosted, '/lab/' + OPEN.join('/'))).body, /"gated":true/);
    assert.match((await get(local, '/lab/' + OPEN.join('/'))).body, /"gated":false/);
  } finally { hosted.stop(); closed.stop(); local.stop(); }
});

test('seat cap: a full server answers 503 with Retry-After and a message, not silent over-admission', async () => {
  const app = await start({ maxSessions: 2, maxPerIp: 0 });
  try {
    assert.equal((await mint(app, ...EB)).status, 200);
    assert.equal((await mint(app, ...EB)).status, 200);
    const full = await mint(app, ...EB);
    assert.equal(full.status, 503);
    assert.equal(full.headers['retry-after'], '15');
    assert.match(full.json.message, /seats/);
    assert.equal(app.store.size(), 2);
  } finally { app.stop(); }
});

test('per-IP cap (rightmost X-Forwarded-For, the ALB-appended one): 429 for that address, others unaffected', async () => {
  const app = await start({ profile: 'hosted', maxSessions: 10, maxPerIp: 2 });
  try {
    const as = (ip) => mint(app, ...EB, { headers: { 'X-Forwarded-For': `6.6.6.6, ${ip}` } });   // leftmost is client-forged
    assert.equal((await as('1.1.1.1')).status, 200);
    assert.equal((await as('1.1.1.1')).status, 200);
    const third = await as('1.1.1.1');
    assert.equal(third.status, 429);
    assert.equal(third.headers['retry-after'], '30');
    assert.equal((await as('2.2.2.2')).status, 200, 'another address still gets a seat');
  } finally { app.stop(); }
});

test('guards: cross-origin or origin-less POST /session, /lab/check and WebSocket are refused; local refuses foreign Host', async () => {
  for (const profile of ['local', 'hosted']) {
    const app = await start({ profile });
    try {
      assert.equal((await mint(app, ...EB, { origin: 'https://evil.com' })).status, 403, `${profile} cross-origin`);
      assert.equal((await mint(app, ...EB, { origin: false })).status, 403, `${profile} no Origin`);
      assert.equal((await post(app, '/lab/check', { token: 'x', stepId: 'hostname' }, { origin: 'https://evil.com' })).status, 403);
      assert.equal(app.store.size(), 0, 'a refused request never takes a seat');
      const { json: { token } } = await mint(app, ...EB);
      const status = await new Promise((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${app.port}/ws?token=${token}`, { headers: { Origin: 'https://evil.com' } });
        ws.on('unexpected-response', (_, res) => resolve(res.statusCode));
        ws.on('open', () => resolve('opened'));
        ws.on('error', () => resolve('error'));
      });
      assert.notEqual(status, 'opened', `${profile}: cross-origin WS must not open`);
    } finally { app.stop(); }
  }
  const local = await start({ profile: 'local' });
  try {
    assert.equal((await get(local, '/', { host: 'rebind.attacker.example:8080' })).status, 421);
    assert.equal((await mint(local, ...EB, { host: 'rebind.attacker.example:8080', origin: 'http://rebind.attacker.example:8080' })).status, 421);
  } finally { local.stop(); }
});

test('/lab/check fails closed: malformed JSON 400, unknown token 403, unknown or lesson step 404, oversized 413', async () => {
  const app = await start();
  try {
    const { json: { token } } = await mint(app, ...EB);
    assert.equal((await post(app, '/lab/check', '{not json')).status, 400);
    assert.equal((await check(app, 'f'.repeat(32), 'hostname')).status, 403);
    assert.equal((await check(app, token, 'nope')).status, 404);
    assert.equal((await check(app, token, '../../etc/passwd')).status, 404);
    assert.equal((await check(app, token, 'what-is-eb')).status, 404, 'lessons have no check');
    assert.equal((await post(app, '/lab/check', 'x'.repeat(5000))).status, 413);
    const early = await check(app, token, 'hostname');
    assert.equal(early.json.pass, false);
    assert.match(early.json.message, /connecting/);
  } finally { app.stop(); }
});

test('/session/remaining counts down from the hard cap for a live token and is 0 for an unknown one', async () => {
  const app = await start({ hardCapMs: 15 * 60 * 1000 });
  try {
    const { json: { token } } = await mint(app, ...EB);
    const r = (await get(app, `/session/remaining?token=${token}`)).json.remainingSec;
    assert.ok(r > 890 && r <= 900, `remaining ${r}`);
    assert.equal((await get(app, '/session/remaining?token=nope')).json.remainingSec, 0);
  } finally { app.stop(); }
});

test('/stats has the cgroup-backed shape plus seat pressure for spike monitoring', async () => {
  const app = await start({ maxSessions: 4 });
  try {
    await mint(app, ...EB);
    const s = (await get(app, '/stats')).json;
    for (const k of ['cpuPercent', 'memUsedMb', 'memLimitMb', 'uptimeSec', 'sessions', 'maxSessions', 'profile']) assert.ok(k in s, k);
    assert.deepEqual([s.sessions, s.maxSessions, s.profile], [1, 4, 'hosted']);
  } finally { app.stop(); }
});

test('every shipped lab loads cleanly and the EB lab has all 11 steps', async () => {
  const app = await start();
  try {
    assert.deepEqual(app.getCatalog().problems, []);
    const eb = app.getCatalog().tracks.find((t) => t.id === 'aws').labs[0];
    assert.equal(eb.steps.length, 11);
    assert.equal(eb.resources.length, 5);
    assert.equal(eb.links[0].url.startsWith('https://docs.aws.amazon.com/'), true);
  } finally { app.stop(); }
});
