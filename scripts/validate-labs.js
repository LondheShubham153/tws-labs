#!/usr/bin/env node
// The contributor + CI quality gate:  npm run lab:validate [--strict] [track/lab]
//
// For every lab it checks the YAML shape, then plays the lab in a throwaway
// sandbox the way a learner would: for each task, the check MUST fail first,
// then the step's solutions/<id>.sh commands are typed into a persistent shell,
// and the check MUST pass. So a lab that merged is a lab that is solvable and
// whose checks aren't vacuous. Needs Linux (/proc, ps) - run it in the container:
//   docker compose run --rm labs node scripts/validate-labs.js --strict
// --strict also fails on house-style warnings (src/lint.js): first step is a lesson, every task has a hint, sizes stay small.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { loadCatalog } = require('../src/loader');
const { lintLab } = require('../src/lint');
const { createSandbox } = require('../src/sandbox');
const { killProcessSession } = require('../src/lib');

const LABS_DIR = process.env.LABS_DIR || path.join(__dirname, '..', 'labs');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const only = args.find((a) => !a.startsWith('--'));
const sandbox = createSandbox({ labsDir: LABS_DIR });
// As root (the container) play each lab as an unprivileged uid, exactly like a live session.
const UID = process.env.LAB_UID ? parseInt(process.env.LAB_UID, 10) : undefined;

function solutionLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

// A persistent bash reading commands from a pipe stands in for the learner's
// terminal: its cwd and background jobs persist between steps, and (being
// detached) it is its own session leader, exactly like the pty shell.
function startShell(home) {
  const [file, args] = sandbox.asUser(UID, home, 'bash', []);
  const child = spawn(file, args, { cwd: home, env: sandbox.scriptEnv(home), detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', () => {});
  child.stdin.on('error', () => {});
  let n = 0;
  return {
    pid: child.pid,
    async run(lines) {
      const mark = `__DONE_${++n}__`;
      child.stdin.write(lines.join('\n') + `\necho ${mark}\n`);
      const t0 = Date.now();
      while (!out.includes(mark)) {
        if (Date.now() - t0 > 30000) throw new Error('solution timed out (a command probably waits for input or an editor)');
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    stop() {
      killProcessSession('/proc', child.pid);
      try { child.kill('SIGKILL'); } catch { /* gone */ }
    },
  };
}

async function validateLab(lab, work) {
  const home = path.join(work, 'home');
  const history = path.join(work, 'history');
  fs.mkdirSync(work, { recursive: true });
  sandbox.prepareHistory(history, UID);
  sandbox.prepareHome(home, UID);
  const setup = sandbox.runSetup(lab.dir, home, UID);
  if (setup.code !== 0) return [`setup.sh failed:\n${setup.out}`];

  const errors = [];
  const shell = startShell(home);
  try {
    for (const step of lab.steps.filter((s) => s.type === 'task')) {
      const ctx = { home, uid: UID, shellPid: shell.pid, historyFile: history };
      const before = await sandbox.runCheck(step.checkFile, ctx);
      if (before.pass) errors.push(`${step.id}: check already passes BEFORE the solution (vacuous check, or an earlier step does this step's work)`);
      const lines = solutionLines(step.solutionFile);
      if (!lines.length) { errors.push(`${step.id}: solutions/${step.id}.sh has no commands`); continue; }
      fs.appendFileSync(history, lines.join('\n') + '\n');
      await shell.run(lines);
      const after = await sandbox.runCheck(step.checkFile, ctx);
      if (!after.pass) errors.push(`${step.id}: check still FAILS after the solution${after.message ? ` ("${after.message}")` : ''}`);
      console.log(`    ${errors.some((e) => e.startsWith(step.id + ':')) ? 'x' : 'ok'}  ${step.id}`);
    }
  } catch (e) {
    errors.push(e.message);
  } finally {
    shell.stop();
  }
  return errors;
}

(async () => {
  if (process.platform !== 'linux') {
    // macOS / Windows: the same proof, run in the project image (see scripts/docker-run.js).
    process.exit(require('./docker-run').run('scripts/validate-labs.js', args, path.join(__dirname, '..')));
  }
  const catalog = loadCatalog(LABS_DIR);
  let failed = catalog.problems.length;
  catalog.problems.forEach((p) => console.error(`  problem: ${p}`));

  const root = (() => { const b = process.env.SANDBOX_DIR || os.tmpdir(); fs.mkdirSync(b, { recursive: true }); return fs.mkdtempSync(path.join(b, 'tws-validate-')); })();
  if (UID !== undefined) fs.chmodSync(root, 0o755);
  for (const track of catalog.tracks) {
    for (const lab of track.labs) {
      const id = `${track.id}/${lab.id}`;
      if (only && only !== id) continue;
      console.log(`- ${id}`);
      const errors = await validateLab(lab, path.join(root, `${track.id}-${lab.id}`));
      errors.forEach((e) => console.error(`    FAIL ${e}`));
      failed += errors.length;
      for (const warning of lintLab(lab)) {
        console.error(`    ${STRICT ? 'FAIL' : 'warn'} style: ${warning}`);
        if (STRICT) failed += 1;
      }
    }
  }
  sandbox.removeTree(root);
  console.log(failed ? `\n${failed} problem(s) found.` : '\nAll labs valid.');
  process.exit(failed ? 1 : 0);
})();
