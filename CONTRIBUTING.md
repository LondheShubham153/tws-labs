# Contributing a lab

Thanks for helping people learn! A lab is a folder of YAML and shell scripts, and a lab PR should touch **only `labs/**`**.
You do not need to touch the server. This is the short path; the full reference is [docs/authoring.md](docs/authoring.md).
Using an AI assistant? Point it at [docs/ai-authoring.md](docs/ai-authoring.md).

You need Node 22+ and Docker (Docker Desktop on Windows and macOS). Run `npm ci` once.

## The path

1. **Pick the topic.** Every lab belongs to a topic on the roadmap (`labs/roadmap.json`), so learners can find it.
   Run `npm run lab:new` with no arguments to list them. Skim the labs already in the track so you don't repeat a task.
2. **Scaffold and register it, in one command:**
   ```bash
   npm run lab:new -- <track> <lab-id> --topic <topic-id> "Lab title"
   ```
   This copies the template, adds the lab to `labs/<track>/track.yaml` and to its roadmap topic. Add `--dry-run` to preview.
   The template ships two sample tasks (`create-file`, `list-files`): replace them with yours and delete their `checks/` and `solutions/` files.
3. **Write it** in `labs/<track>/<lab-id>/`: `lab.yaml` (the steps), `checks/<step>.sh` and `solutions/<step>.sh` for every task,
   and optionally `setup.sh`. [Check recipes](docs/authoring.md#check-recipes) show the common patterns.
4. **Prove it:**
   ```bash
   npm run lab:check -- <track>/<lab-id>
   ```
   First the static checks (instant, any OS), then the real proof: for every task the check must **fail before** the solution and
   **pass after**. On macOS and Windows the proof runs in Docker for you. CI runs the same two steps.
   Then try it as a learner: `./start_local_labs.sh`, edit, refresh (labs are re-read on every page load).
5. **Open a PR.** The template has a short checklist. If you had to change anything outside `labs/**`, say why in the PR.

## Definition of done

- `npm run lab:check -- <track>/<lab-id>` passes with no warnings.
- You played it once in the browser from start to finish.
- Every task says exactly what to do, has a hint (a nudge, not the answer), and its check grades real state.
- The lab teaches something the track does not already teach (the linter flags a task that repeats another lab's).

## Style guide

- **One concept per lab, 5–15 minutes, 3–7 tasks** (graded steps; lessons don't count). Small steps beat clever ones.
- Each task says *exactly* what to do. The `hint` is a nudge, not the answer; the check's failure
  message (first line it prints) should say what's still missing.
- **Grade state, not keystrokes.** Prefer "the file exists / the branch is merged / mode is 600".
  Use `ran` (command history) only when there's nothing to inspect, e.g. "run `ls -l`".
- Checks must be **tolerant of valid alternatives** (`mv` or `cp`+`rm`; `-la` or `-l -a`) and never
  require the learner to type your exact command when the outcome is what matters.
- No network, no `sudo`, nothing that needs a package that isn't in the image. Need a tool?
  Open an issue / add it to the `Dockerfile` in the same PR.
- Scripts are plain bash and must be safe: they run as the learner's unprivileged user inside the sandbox.
  No `curl | sh`, no writing outside `$LAB_HOME`.
- Lesson text is markdown (bold, `code`, lists, fenced blocks, https links). Raw HTML is escaped.
- Keep it friendly: explain the *why* in lessons, and welcome beginners.
- Don't name other products or platforms in lab text or comments (`npm run check:hygiene` checks). Stick to the tools the lab teaches.

## Ground rules

- Be kind: see the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues go through [SECURITY.md](SECURITY.md), never a public issue.
- By contributing you agree your work is released under the repository's [MIT License](LICENSE).
- Never commit secrets, AWS account IDs or ARNs. Pull requests run CI (tests, every lab, a compose smoke test) and must pass before merge.
