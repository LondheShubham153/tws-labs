---
description: Create a new lab (scaffold, write, lint, prove) following docs/ai-authoring.md
argument-hint: <track> <lab-id> <topic-id> "<what a learner can do afterwards>"
---

Create a new lab for this repo: $ARGUMENTS

Follow `docs/ai-authoring.md` exactly. In short: run `npm run lab:new -- <track> <lab-id> --topic <topic-id> "Title"`, write the lab under
`labs/<track>/<lab-id>/`, then iterate with `npm run lab:lint -- <track>/<lab-id> --json` and `npm run lab:check -- <track>/<lab-id>` until it
passes with no warnings. Touch only `labs/**`, never edit tests, `track.yaml` or `roadmap.json` by hand, and do not commit or push. If the topic
is not on the roadmap, stop and ask. Finish by summarising the tasks and what each check grades.
