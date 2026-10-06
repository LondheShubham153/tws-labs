# Authoring reference

Fastest path: `npm run lab:new -- <track> <lab-id> --topic <topic-id>`, edit, `npm run lab:check -- <track>/<lab-id>`. See [CONTRIBUTING.md](../CONTRIBUTING.md).
This page is the reference.

```
labs/<track>/track.yaml                    title, description, labs: [lab ids, in order]
labs/<track>/<lab>/lab.yaml                title, level, minutes, summary, steps
labs/<track>/<lab>/setup.sh                optional - seeds the learner's fresh home directory
labs/<track>/<lab>/checks/<step-id>.sh     grading script for each task
labs/<track>/<lab>/solutions/<step-id>.sh  the commands that solve each task (one per line)
```

Ids (tracks, labs, steps) are lowercase letters, digits and dashes.

## track.yaml, roadmap.json and site.yaml

```yaml
# labs/<track>/track.yaml
order: 1                    # position among tracks (lower first); default after all numbered tracks
title: Linux Fundamentals
description: ...
labs: [navigating, files]
video:                       # optional: shown on the track page
  title: Linux For DevOps In One Shot
  url: https://www.youtube.com/watch?v=...     # https only
  note: One line shown under the title.
```

**`labs/roadmap.json` is the source of truth for the syllabus and each topic's status.** The home-page map, the Roadmap page, the
Videos page and every breadcrumb are built from it. Each topic belongs to a line (DevOps, Cloud or AI):

```json
{ "id": "docker", "title": "Docker", "status": "next", "relevance": 97, "also": ["cloud"],
  "subtopics": ["Architecture, images, containers", "Multi-stage builds"],
  "video": { "title": "Docker In One Shot", "url": "https://youtu.be/..." } }
```

| field | meaning |
|---|---|
| `status` | `live` (has labs) · `building` · `next` (shown on the home map) · `later` (Roadmap page only) |
| `track` / `labs` | the real content: `"track": "git-basics"` (all its labs) or `"labs": ["linux-fundamentals/files"]`. One lab links straight to it; several link to the track page |
| `relevance` | 0-100, from the planning sheet; orders topics and draws the thin meter on the Roadmap page |
| `also` | other lines this topic touches (shown as an interchange hint) |
| `short` | optional short label for the home illustration |
| `video` | optional `{title, url}` (https) shown on the Videos page |

The catalog decides what is true, and the server reports any mismatch on the home page and in `npm test`: a `live` topic needs labs; a topic
with labs must be `live`; **every lab must belong to a topic** (so no lab is invisible); unknown tracks or labs are errors.
Keep the home map calm: about six topics per line at most (live + next); put the rest under `later`.

`labs/site.yaml` holds `channel: {name, url}` and optional extra `videos:` (https only).

To check the planning sheet for topics not yet on the roadmap, run `node scripts/import-roadmap.js` (report only; `--write` appends them
as `later`). The app never reads the sheet.

## lab.yaml

```yaml
title: Branches and merging
level: intermediate          # beginner | intermediate | advanced
minutes: 12
summary: One sentence shown on the track page.
steps:
  - id: why                  # unique within the lab; also names checks/why.sh for tasks
    type: lesson             # lesson: read and press "Got it"
    title: Branches are cheap
    body: |
      Markdown text.
  - id: new-branch
    type: task               # task: needs checks/new-branch.sh and solutions/new-branch.sh
    title: Create a branch
    body: Create a branch called `feature` and switch to it.
    hint: "Try: git switch -c feature"     # shown when the check fails and prints no message
    success: Correct. Branches are cheap.  # optional (<= 100 chars): the green confirmation when the check passes
    local_body: |                          # optional: different wording when run on a learner's own machine
      Same task, but mention the laptop instead of the hosted cluster.
```

Optional lab-level fields: `links:` (shown in the terminal bar) and `resources:` (shown on the completion screen),
both lists of `{title, url, desc}` with `https://` URLs.

## setup.sh

Runs once, as the learner, with `$HOME` (and the working directory) set to their empty sandbox home,
*before* their shell starts. Create files, run `git init`, make commits (a Git identity is preconfigured).

## Check scripts

Run with `bash`, as the learner's user, working directory = their home. **Exit 0 = pass.** The first
line printed to stdout is shown to the learner on failure. Start with `. "$LAB_LIB"` (that is `labs/lib.sh`) for helpers.

| Variable | Meaning |
|---|---|
| `LAB_HOME` | The learner's home (same as `$HOME` and the cwd) |
| `LAB_SHELL_PID` | PID of the learner's shell (= its Linux session id) |
| `LAB_HISTORY` | File containing the command lines they have submitted |

| Helper | Meaning |
|---|---|
| `fail "msg"` | Print `msg` and exit 1 |
| `file_has FILE REGEX` | FILE exists and a line matches the extended regex |
| `ran CMD` | The learner ran `CMD` as a command (not just typed the word in `echo CMD`) |
| `ran_re REGEX` | Some submitted line matches REGEX |
| `shell_cwd` | The learner's shell's current directory *right now* |
| `proc_running NAME` | A process called NAME is alive in the learner's shell session |
| `in_repo DIR args...` | `git -C $LAB_HOME/DIR args...` |
| `listening PORT` | Something accepts TCP connections on PORT (reads `/proc/net/tcp*`) |
| `http_code URL [curl args]` | The HTTP status code, `000` if nothing answers within 2 seconds |
| `yaml_get FILE EXPR` | Load FILE as YAML into `d` and print the JavaScript EXPR (objects as JSON). A bare `on:` loads as key `true`: use `d[true] \|\| d.on` |

Example — "mode must be 600":

```bash
. "$LAB_LIB"
[ "$(stat -c %a secret.txt)" = "600" ] || fail "secret.txt should be mode 600 (rw-------)."
```

Notes: checks have a 5-second limit. History capture ignores arrow-key recall, so state checks are
more reliable than `ran`. Checks must be read-only: don't change the learner's files.

**Network labs share one loopback.** Every session in a container sees the same `127.0.0.1`, so never hard-code a port.
Have `setup.sh` write a free per-session port (and any per-session numbers) into the learner's home, tell the learner to use it,
and read it back in the check. Port 8080 is the lab server. There is no internet, no `ping` and no raw sockets in the sandbox.

## Solution scripts

`solutions/<step-id>.sh` holds what a learner would type, **one command per line**. `validate-labs.js`
plays them into a persistent shell (so `cd` and background jobs carry over to later steps) and records
them in the history. No heredocs or multi-line `if`s — keep it to simple lines.

## Check recipes

All run as the learner, in their home directory; start every check with `. "$LAB_LIB"`. Print a nudge with `fail "..."`, never the answer.

| To grade | Check |
|---|---|
| a file exists / is non-empty | `[ -s notes.txt ] \|\| fail "notes.txt is missing or empty."` |
| a directory exists | `[ -d logs ] \|\| fail "The logs/ directory does not exist yet."` |
| file mode | `[ "$(stat -c %a api.key)" = "600" ] \|\| fail "api.key should have mode 600."` |
| a file's content is the real output of a command | `cmp -s recent.txt <(tail -n 3 service.log) \|\| fail "recent.txt should hold the last 3 lines."` |
| a file mentions something | `file_has config.env '^PORT=8080$' \|\| fail "config.env needs PORT=8080."` |
| a script is executable and was run | `[ -x start.sh ] \|\| fail "..."; ran_re '(^\|[;&\|][[:space:]]*)\./start\.sh' \|\| fail "Run it with ./start.sh."` |
| git state | `in_repo project git rev-parse --verify feature >/dev/null 2>&1 \|\| fail "Create the feature branch."` |
| the shell is somewhere | `[ "$(shell_cwd)" = "$LAB_HOME/project" ] \|\| fail "cd into project."` |
| a process is running | `proc_running yes \|\| fail "Start it in the background."` |
| the learner ran a command (only when it leaves no state) | `ran ls \|\| fail "Run ls -l."` |

`solutions/<step>.sh` is what a learner would type, one command per line. If the check uses `ran_re`, the solution must really run that command.

## Anti-patterns (`npm run lab:lint` flags several)

- **A check anyone can fake**: grading only a status file the learner can write by hand (`echo ONLINE > .status`). Also require the action that makes it (`ran_re`), or grade something the action produces.
- **Exact-command checks**: grade the outcome, so `mv` and `cp` + `rm` both pass.
- **A check that passes before the step is done** (the validator rejects it) or **depends on an earlier step's side effect**.
- **A task another lab already teaches**: reuse the idea in a new situation, or teach a new tool instead.
- **A hint that is the whole answer**: say which command family to look at, not the finished line.
- **A check that changes the learner's files**: checks are read-only.
- **Heredocs or multi-line `if`s in solutions**: one command per line.

## Validation rules (`node scripts/validate-labs.js`)

For each task, in order, in a fresh sandbox: check **fails** → solution runs → check **passes**.
It also fails the lab if a check already passes before its step (that's a vacuous check, or an earlier
step is doing this step's work), or if `lab.yaml` is malformed.

Run `npm run lab:check -- <track>/<lab>`: the static lint, then this proof (in Docker on macOS and Windows, directly on Linux).

## House style (`--strict` enforces it)

Every lab should feel like the same product: start with a lesson that frames the idea; give every task a hint (a nudge, not the answer);
keep the title <= 48 characters, the summary <= 100, each step body <= 700, and the lab between 5 and 20 minutes (aim for 15 or less; 3 to 7 graded tasks, lessons not counted).
