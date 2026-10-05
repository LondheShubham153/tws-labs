// Lab tools that need Linux (/proc) run in the project image on macOS and Windows.
// commandsFor() is pure so it can be tested; run() executes it and returns the exit status.
const { spawnSync } = require('child_process');

function commandsFor(script, args) {
  return [
    ['docker', ['compose', 'build', '--quiet', 'labs']],
    ['docker', ['compose', 'run', '--rm', 'labs', 'node', script, ...args]],
  ];
}

function run(script, args, cwd) {
  for (const [bin, binArgs] of commandsFor(script, args)) {
    const r = spawnSync(bin, binArgs, { cwd, stdio: 'inherit' });
    if (r.error) {
      console.error('This check needs Linux, so it runs in Docker, and Docker was not found.\nInstall Docker Desktop (see ./start_local_labs.sh for per-system hints) and try again.');
      return 1;
    }
    if (r.status !== 0) return r.status === null ? 1 : r.status;
  }
  return 0;
}

module.exports = { commandsFor, run };
