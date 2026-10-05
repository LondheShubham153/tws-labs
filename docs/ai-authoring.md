# Writing a lab with an AI assistant

A brief you can paste into any coding assistant (or read yourself). It makes the assistant follow the same path a human does,
and the repo's own commands decide whether the result is acceptable. Human version: [CONTRIBUTING.md](../CONTRIBUTING.md).
Full format reference: [authoring.md](authoring.md).

## Give the assistant

1. **Topic**: a roadmap topic id. Run `npm run lab:new` with no arguments to list them. If the topic is not on the roadmap, stop and ask the human;
   adding a topic is a deliberate edit to `labs/roadmap.json`, not part of a lab PR.
2. **Learner level and outcome**: "after this lab a learner can ...", one concept, 3 to 7 **tasks** (graded steps; lessons don't count), `minutes: 5` to `15`
   (the linter accepts up to 20, but aim for 15 or less).
3. **Constraints**: runs as an unprivileged user in a Debian container, no network, no `sudo`, only tools in the `Dockerfile`.

## The loop (run these exact commands)

```bash
npm ci                                                        # once
npm run lab:new -- <track> <lab-id> --topic <topic-id> "Title" # scaffolds and registers; never edit track.yaml or roadmap.json by hand
# the scaffold ships two SAMPLE tasks (create-file, list-files): replace them, and delete their checks/ and solutions/ files
# edit labs/<track>/<lab-id>/{lab.yaml,setup.sh,checks/*.sh,solutions/*.sh}
npm run lab:lint -- <track>/<lab-id> --json                   # optional: instant, machine-readable findings (lab:check runs the same lint)
npm run lab:check -- <track>/<lab-id>                         # lint + naming check + proof (fail before the solution, pass after); uses Docker off Linux
```

Repeat until `lab:check` ends with "All labs valid." and printed no `warn`/`ERROR` lines (Docker build output in between is normal). The naming check
(`npm run check:hygiene`) runs inside `lab:lint`, so there is nothing extra to run. Do not edit files outside `labs/**`.
In particular do not edit tests: they derive lab counts from the catalog.

## When to add `ran_re` to a state check

Grade state first. Add `ran_re 'the-command'` **as well** only when the learner could produce the same state by typing the answer instead of using the tool the
task teaches (for example a file that holds the output of `sort | uniq -c`). State alone is not enough there, and `ran_re` alone is never enough. The
solution file must really run that command, so the proof still passes.

## Write each task like this

- `lab.yaml` step: `id` (also names `checks/<id>.sh` and `solutions/<id>.sh`), `type: task`, a `title`, a `body` that says exactly what to do,
  and a `hint` that nudges without giving the whole command.
- `checks/<id>.sh`: start with `. "$LAB_LIB"`; grade **real state** (file, mode, content equal to the output of a real command, git state, running process);
  end every failure path with `fail "what is still missing"`; read-only; accept valid alternatives. Patterns: [Check recipes](authoring.md#check-recipes).
- `solutions/<id>.sh`: what a learner would type, one command per line, no heredocs.
- `setup.sh` (optional): runs under **bash**, as the learner, with the empty home as the working directory, before their shell starts (15 second limit). Make files
  deterministic (bash arrays and `$(( ))` are fine); no randomness, no network.
- The first step is a lesson that frames the idea; the last can be a short wrap-up lesson.

## Definition of done

- [ ] `npm run lab:check -- <track>/<lab-id>` passes with no warnings, and the two sample tasks from the scaffold are gone.
- [ ] Every task's check cannot be satisfied by creating a file by hand; it grades the thing the task is about.
- [ ] No task repeats one that another lab already teaches (the linter flags identical checks; also skim `labs/<track>/`).
- [ ] No other product, platform or company is named (`npm run check:hygiene`); only the tools the lab teaches.
- [ ] The diff touches only `labs/**`.

## Ask the human first when

the topic is not on the roadmap, the lab needs a tool the image lacks, you want to change the engine, UI or `deploy/`,
or a check cannot be made to grade state (explain why `ran` is the only option).

## Do not

commit or push, add secrets, account IDs or ARNs, or weaken a check so a solution passes: fix the solution or the lab instead.
