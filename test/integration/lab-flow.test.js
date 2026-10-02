// Real shells over real WebSockets, graded by the real check scripts. Needs Linux
// (/proc, `ps -s`, a working pty). Elsewhere these skip with a reason instead of failing;
// run them in the image: docker compose run --rm labs sh -c 'node --test test/integration/*.test.js'
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { start, check, openLab, sleep, ISOLATED, WebSocket } = require('./helpers');

function canSpawnPty() {
  if (process.platform !== 'linux') return 'needs Linux';
  try { require('node-pty').spawn('/bin/sh', ['-c', 'true'], {}).kill(); return false; } catch { return 'pty cannot spawn here'; }
}
const SKIP = canSpawnPty();
const t = (name, fn) => test(name, { skip: SKIP }, fn);
const iso = (name, fn) => test(name, { skip: SKIP || (!ISOLATED && 'needs root + LAB_UID (the image)') }, fn);
const pass = async (app, token, step) => (await check(app, token, step)).json.pass;
const EB = ['aws', 'elastic-beanstalk-cluster-mode'];

t('files lab: graded on real state, typed one keystroke at a time; failure messages nudge without giving the answer', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'files');
  try {
    assert.equal(await pass(app, lab.token, 'mkdir'), false);
    await lab.run('mkdir workspace');
    assert.equal(await pass(app, lab.token, 'mkdir'), true);
    await lab.run('echo "hello linux" > workspace/hello.txt');
    assert.equal(await pass(app, lab.token, 'write'), true);
    const wrong = (await check(app, lab.token, 'cp')).json;
    assert.equal(wrong.pass, false);
    assert.match(wrong.message, /backup/);
  } finally { lab.ws.close(); app.stop(); }
});

t('shell scripting lab: a script typed into the live terminal is executable in the sandbox and graded by running it', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'shell-scripting-basics');
  try {
    assert.equal(await pass(app, lab.token, 'hello'), false);
    await lab.run("printf '#!/bin/bash\\necho \"Hello, World!\"\\n' > hello.sh");
    const early = (await check(app, lab.token, 'hello')).json;
    assert.equal(early.pass, false);
    assert.match(early.message, /executable/);
    await lab.run('chmod +x hello.sh');
    assert.match(await lab.run('./hello.sh'), /Hello, World!/);
    assert.equal(await pass(app, lab.token, 'hello'), true);
    await lab.run("printf '#!/bin/bash\\necho \"Hello, $1!\"\\n' > greet.sh");
    assert.equal(await pass(app, lab.token, 'arguments'), true, 'greet.sh is run with several different arguments');
  } finally { lab.ws.close(); app.stop(); }
});

t('shell cwd is graded live, and bare `cd` returns to the session home', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'navigating');
  try {
    assert.equal(await pass(app, lab.token, 'cd-down'), false);
    await lab.run('cd projects/website');
    assert.equal(await pass(app, lab.token, 'cd-down'), true);
    assert.equal(await pass(app, lab.token, 'cd-home'), false);
    await lab.run('cd');
    assert.equal(await pass(app, lab.token, 'cd-home'), true);
  } finally { lab.ws.close(); app.stop(); }
});

t('git lab: setup seeds a repo with an identity, and git state is what is graded', async () => {
  const app = await start();
  const lab = await openLab(app, 'git-basics', 'branches-and-merge');
  try {
    await lab.run('cd proj');
    await lab.run('git switch -c feature');
    assert.equal(await pass(app, lab.token, 'enter'), true);
    assert.equal(await pass(app, lab.token, 'new-branch'), true);
    assert.equal(await pass(app, lab.token, 'commit-on-branch'), false);
    await lab.run('echo hi > feature.txt && git add feature.txt && git commit -q -m "Add feature"');
    assert.equal(await pass(app, lab.token, 'commit-on-branch'), true);
  } finally { lab.ws.close(); app.stop(); }
});

t('EB lab: hostname needs the command actually run (typing or echoing the word is not enough)', async () => {
  const app = await start();
  const lab = await openLab(app, ...EB);
  try {
    await lab.run('echo hostname');
    assert.equal(await pass(app, lab.token, 'hostname'), false);
    await lab.run('hostname');
    assert.equal(await pass(app, lab.token, 'hostname'), true);
  } finally { lab.ws.close(); app.stop(); }
});

t('EB lab: container-vs-node and limits pass only after the real commands are submitted', async () => {
  const app = await start();
  const lab = await openLab(app, ...EB);
  try {
    assert.equal(await pass(app, lab.token, 'container-vs-node'), false);
    await lab.run('cat /etc/os-release');
    assert.equal(await pass(app, lab.token, 'container-vs-node'), false, 'uname still missing');
    await lab.run('uname -r');
    assert.equal(await pass(app, lab.token, 'container-vs-node'), true);
    await lab.run('cat /sys/fs/cgroup/memory.max');
    assert.equal(await pass(app, lab.token, 'limits'), false);
    await lab.run('cat /sys/fs/cgroup/cpu.max');
    assert.equal(await pass(app, lab.token, 'limits'), true);
  } finally { lab.ws.close(); app.stop(); }
});

t('EB lab: mark is per-session; scale passes while yes runs; cleanup needs it started AND killed', async () => {
  const app = await start();
  const a = await openLab(app, ...EB);
  const b = await openLab(app, ...EB);
  try {
    assert.equal(await pass(app, a.token, 'mark'), false);
    await a.run('echo "Jack" > ~/mark.txt');
    assert.equal(await pass(app, a.token, 'mark'), true);
    assert.equal(await pass(app, b.token, 'mark'), false, "another session's mark must not satisfy this one");

    assert.equal(await pass(app, a.token, 'cleanup'), false, 'skipping ahead must not pass vacuously');
    assert.equal(await pass(app, a.token, 'scale'), false);
    await a.run('yes > /dev/null &');
    assert.equal(await pass(app, a.token, 'scale'), true);
    assert.equal(await pass(app, b.token, 'scale'), false, "b is not running yes: a's process must not count");
    assert.equal(await pass(app, a.token, 'cleanup'), false, 'yes is still running');
    await a.run('kill %1');
    await sleep(200);
    assert.equal(await pass(app, a.token, 'cleanup'), true);
  } finally { a.ws.close(); b.ws.close(); app.stop(); }
});

t('a background process is reaped when its session disconnects without an explicit kill', async () => {
  const app = await start();
  const lab = await openLab(app, ...EB);
  try {
    const out = await lab.run('sleep 300 & echo PID=$!');
    const pid = parseInt(out.match(/PID=(\d+)/)[1], 10);
    process.kill(pid, 0);                                  // alive
    lab.ws.close();
    await sleep(800);
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally { app.stop(); }
});

t('a second WebSocket on one token is refused; `exit` ends the session; the sandbox home is deleted', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'files');
  try {
    const code = await new Promise((resolve) => {
      const dup = new WebSocket(`ws://127.0.0.1:${app.port}/ws?token=${lab.token}`, { headers: { Origin: app.origin } });
      dup.on('close', (c) => resolve(c));
    });
    assert.equal(code, 4002);
    const home = path.join(app.sandboxDir, lab.id);
    assert.ok(fs.existsSync(home));
    const closed = new Promise((resolve) => lab.ws.on('close', (c, r) => resolve(r.toString())));
    await lab.type('exit\r');
    assert.equal(await closed, 'shell exited');
    await sleep(500);
    assert.ok(!fs.existsSync(home), 'home removed when the session ends');
    assert.equal(app.store.size(), 0, 'the seat is freed');
  } finally { app.stop(); }
});

t('a resize control frame resizes the pty and is never typed into the shell; an oversized frame drops only that client', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'files');
  const other = await openLab(app, 'linux-fundamentals', 'files');
  try {
    lab.ws.send('\u0000resize:132,41');
    await sleep(200);
    assert.match(await lab.run('stty size'), /41 132/);
    assert.ok(!lab.output().includes('resize:'));
    const closed = new Promise((resolve) => lab.ws.on('close', resolve));
    lab.ws.send('x'.repeat(70 * 1024));
    await closed;
    assert.match(await other.run('echo still-alive'), /still-alive/, 'other sessions are unaffected');
  } finally { other.ws.close(); app.stop(); }
});

iso('isolation: every session is its own unprivileged user; one learner cannot read or signal another', async () => {
  const app = await start();
  const a = await openLab(app, ...EB);
  const b = await openLab(app, ...EB);
  try {
    const uidOf = async (l) => (await l.run('id -u')).match(/(\d{4,})\r?\n/)[1];
    const [ua, ub] = [await uidOf(a), await uidOf(b)];
    assert.notEqual(ua, ub);
    assert.ok(Number(ua) >= 10000 && Number(ub) >= 10000, 'never root');

    await a.run('echo secret > ~/s.txt');
    const read = await b.run(`cat ${path.join(app.sandboxDir, a.id)}/s.txt`);
    assert.match(read, /Permission denied/);
    assert.ok(!read.includes('secret\r'), 'content did not leak');
    assert.match(await b.run(`ls ${app.sandboxDir}`), /Permission denied/, 'sandbox root cannot be listed');

    await a.run('yes > /dev/null &');
    await b.run('pkill -x yes');                           // different uid: the signal is refused
    assert.equal(await pass(app, a.token, 'scale'), true, "b could not kill a's process");
  } finally { a.ws.close(); b.ws.close(); app.stop(); }
});

t('resource limits are really applied inside the shell (processes, address space, file size) - hosted and local differ', async () => {
  for (const [profile, vKb] of [['hosted', 262144], ['local', 1048576]]) {
    const app = await start({ profile });
    const lab = await openLab(app, 'linux-fundamentals', 'files');
    try {
      const out = await lab.run('echo LIM u=$(ulimit -u) v=$(ulimit -v) f=$(ulimit -f)');
      assert.match(out, new RegExp(`LIM u=256 v=${vKb} f=40960`), profile);
    } finally { lab.ws.close(); app.stop(); }
  }
});

t('memory pressure sacrifices learner processes first: every shell (and its children) has the maximum OOM score', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'files');
  try {
    assert.match(await lab.run('cat /proc/self/oom_score_adj'), /(^|\D)1000\r?\n/);
    assert.match(await lab.run('sh -c "cat /proc/self/oom_score_adj"'), /(^|\D)1000\r?\n/, 'inherited by children');
  } finally { lab.ws.close(); app.stop(); }
});

iso('isolation: learners cannot read the lab answers (solutions/) but the checks still work', async () => {
  const app = await start();
  const lab = await openLab(app, 'linux-fundamentals', 'files');
  try {
    const out = await lab.run(`cat ${path.join(app.cfg.labsDir, 'linux-fundamentals', 'files', 'solutions', 'mkdir.sh')}`);
    assert.match(out, /Permission denied/);
    await lab.run('mkdir workspace');
    assert.equal(await pass(app, lab.token, 'mkdir'), true);
  } finally { lab.ws.close(); app.stop(); }
});
