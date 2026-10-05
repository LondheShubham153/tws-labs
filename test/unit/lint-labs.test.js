const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { lintLabs, normalise } = require('../../scripts/lint-labs');
const { commandsFor } = require('../../scripts/docker-run');

const GOOD_CHECK = '. "$LAB_LIB"\n[ -f hello.txt ] || fail "hello.txt does not exist yet."\n[ -s hello.txt ] || fail "hello.txt is empty."\n';

// labs dir with the given labs: { id: { check, solution, setup } } on one track, and a roadmap that lists them all
function labsDir(labs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lintlabs-'));
  const ids = Object.keys(labs);
  fs.mkdirSync(path.join(root, 't'), { recursive: true });
  fs.writeFileSync(path.join(root, 't', 'track.yaml'), `title: T\ndescription: d\nlabs: [${ids.join(', ')}]\n`);
  for (const id of ids) {
    const d = path.join(root, 't', id);
    fs.mkdirSync(path.join(d, 'checks'), { recursive: true });
    fs.mkdirSync(path.join(d, 'solutions'), { recursive: true });
    fs.writeFileSync(path.join(d, 'lab.yaml'), `title: ${id}\nlevel: beginner\nminutes: 10\nsummary: s\nsteps:\n  - {id: intro, type: lesson, title: Intro, body: hi}\n  - {id: do, type: task, title: Do, body: do it, hint: "Try: touch hello.txt"}\n`);
    fs.writeFileSync(path.join(d, 'checks', 'do.sh'), labs[id].check ?? GOOD_CHECK);
    fs.writeFileSync(path.join(d, 'solutions', 'do.sh'), labs[id].solution ?? 'touch hello.txt\n');
    if (labs[id].setup) fs.writeFileSync(path.join(d, 'setup.sh'), labs[id].setup);
  }
  fs.writeFileSync(path.join(root, 'roadmap.json'), JSON.stringify({ version: 1, domains: [{ id: 'devops', title: 'DevOps', topics: [{ id: 'x', title: 'X', status: 'live', labs: ids.map((i) => `t/${i}`) }] }] }));
  return root;
}
const msgs = (f, level) => f.filter((x) => !level || x.level === level).map((x) => `${x.lab}: ${x.message}`);

test('a well-formed lab has no findings', () => {
  assert.deepEqual(lintLabs({ labsDir: labsDir({ good: {} }) }), []);
});

test('flags a check without the helpers, without a failure path, or without a nudge', () => {
  const f = lintLabs({ labsDir: labsDir({
    nolib: { check: '[ -f hello.txt ] || { echo "missing"; exit 1; }\n' },
    never: { check: '. "$LAB_LIB"\ntrue\n' },
    silent: { check: '. "$LAB_LIB"\n[ -f hello.txt ] || exit 1\n' },
  }) });
  assert.match(msgs(f, 'error').join('\n'), /t\/nolib: checks\/do\.sh must start with/);
  assert.match(msgs(f, 'error').join('\n'), /t\/never: checks\/do\.sh never fails/);
  assert.match(msgs(f, 'warn').join('\n'), /t\/silent: checks\/do\.sh: give the learner a nudge/);
});

test('flags a check that changes the learner\'s files, but not command substitutions or comments', () => {
  const f = lintLabs({ labsDir: labsDir({
    writes: { check: '. "$LAB_LIB"\ntouch hello.txt\n[ -f hello.txt ] || fail "no"\n' },
    reads: { check: '. "$LAB_LIB"\n# rm is only a comment here\n[ "$(mkdir -p /tmp/x; echo 1)" = 1 ] || fail "no"\n[ -f hello.txt ] || fail "no"\n' },
  }) });
  assert.match(msgs(f, 'warn').join('\n'), /t\/writes: checks\/do\.sh changes files/);
  assert.doesNotMatch(msgs(f).join('\n'), /t\/reads/);
});

test('flags heredocs and line continuations in solutions, and script syntax errors', () => {
  const f = lintLabs({ labsDir: labsDir({
    heredoc: { solution: 'cat > hello.txt <<EOF\nhi\nEOF\n' },
    cont: { solution: 'touch \\\n hello.txt\n' },
    broken: { setup: 'if [ -f x ]; then\n' },
  }) });
  const errs = msgs(f, 'error').join('\n');
  assert.match(errs, /t\/heredoc: solutions\/do\.sh: one command per line/);
  assert.match(errs, /t\/cont: solutions\/do\.sh: one command per line/);
  assert.match(errs, /t\/broken: setup\.sh:/);
});

test('flags a task whose check repeats another lab\'s task, but not one-line checks', () => {
  const two = lintLabs({ labsDir: labsDir({ a: {}, b: { check: GOOD_CHECK.replace('does not exist yet', 'is missing').replace(/[0-9]/g, '') } }) });
  assert.match(msgs(two, 'warn').join('\n'), /t\/b: task "do" has the same check as t\/a\/do/);
  const one = lintLabs({ labsDir: labsDir({ a: { check: '. "$LAB_LIB"\n[ -d x ] || fail "no"\n' }, b: { check: '. "$LAB_LIB"\n[ -d x ] || fail "no"\n' } }) });
  assert.doesNotMatch(msgs(one).join('\n'), /same check/);
});

test('the repeated-task rule would have caught the grep-into-errors.txt task that the Pipes and Search lab already has', () => {
  const pipes = '. "$LAB_LIB"\n[ -f errors.txt ] || fail "errors.txt does not exist yet."\n[ "$(wc -l < errors.txt)" -eq 3 ] || fail "errors.txt should hold exactly the 3 ERROR lines."\n! grep -qv ERROR errors.txt || fail "errors.txt contains lines that are not ERROR lines."\n';
  const copy = '. "$LAB_LIB"\n[ -f errors.txt ] || fail "errors.txt does not exist yet."\n[ "$(wc -l < errors.txt)" -eq 2 ] || fail "errors.txt should contain exactly the 2 ERROR lines."\n! grep -qv ERROR errors.txt || fail "errors.txt should only contain lines with ERROR."\n';
  assert.equal(normalise(pipes), normalise(copy));
});

test('catalog and roadmap problems are reported as errors, and the shipped labs are clean', () => {
  const dir = labsDir({ good: {} });
  fs.writeFileSync(path.join(dir, 'roadmap.json'), JSON.stringify({ version: 1, domains: [{ id: 'devops', title: 'DevOps', topics: [] }] }));
  assert.match(msgs(lintLabs({ labsDir: dir }), 'error').join('\n'), /roadmap: roadmap\.json: lab "t\/good" is not on the roadmap/);
  const shipped = lintLabs({ labsDir: path.join(__dirname, '..', '..', 'labs') });
  assert.deepEqual(msgs(shipped, 'error'), []);
});

test('non-Linux machines run the proof in Docker: build quietly, then run the script with the same arguments', () => {
  assert.deepEqual(commandsFor('scripts/validate-labs.js', ['--strict', 'linux-fundamentals/files']), [
    ['docker', ['compose', 'build', '--quiet', 'labs']],
    ['docker', ['compose', 'run', '--rm', 'labs', 'node', 'scripts/validate-labs.js', '--strict', 'linux-fundamentals/files']],
  ]);
});
