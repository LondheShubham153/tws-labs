# TWS Labs — production readiness checklist

`[x]` = proven by a real run (test, image, or script). `[ ] (live)` = can only be proven against the deployed
Elastic Beanstalk environment — run `deploy/smoke-test.py <hostname>` after the next deploy and tick these.
Last full verification: the restructure to one engine + one catalog (see git log), run in the production image.

## Pages and navigation
- [x] Every page (home, track, lab, videos, roadmap, 404) has the same header: logo, Labs/Videos/Roadmap tabs, env chip, Subscribe, one rocket sprite — `assertBrandedPage` on every route, both profiles
- [x] Home map shows three routes in order (DevOps, Cloud, AI) with at most six topics each; lab pages are a seatless shell
- [x] Roadmap (`/roadmap`) lists every topic by line from `labs/roadmap.json`; `/upcoming` redirects; Videos are grouped by line; the roadmap is validated against the real lab catalog
- [x] Logo, stylesheet, xterm and scripts are served locally; only the hosted profile loads web fonts

## Lab flow (all labs)
- [x] 18 labs across 6 tracks validate and follow the house style: every task's check fails before its solution and passes after (`scripts/validate-labs.js --strict`)
- [x] Lesson steps advance on "Got it"; task steps need a passing Check; Skip/Back/progress dots; completion screen with resources
- [x] `/session/remaining` counts down from the real hard cap; stats strip reads the container's own cgroup
- [x] Elastic Beanstalk lab: `hostname` needs the command actually run; `mark` is per-session; `scale` passes only while this session runs `yes`; `cleanup` needs it started and killed
- [x] (live) the same flow through the real ALB + WebSocket — `deploy/smoke-test.py`, 20/20 on the rebuilt environment (2026-10-01)

- [x] A passing Check shows a green "Correct" line (optional per-step `success:` text); a failing one still shows the amber hint (`public/lab.js`, `public/lab.css`)
- [x] The nine Docker, Networking and GitHub Actions labs: every task failed before and passed after its solution through a real pty in the image (local profile). Not yet run on the hosted profile
- [ ] (live) the new labs on the hosted Cluster Mode deployment: the runtime image gained `jq`, `dnsutils`, `iproute2`, `netcat-openbsd` and `openssl`, and `node` cannot start under the hosted 256 MiB address-space cap, so these labs use bash and `nc` servers; confirm on the live environment

## Invite gate (hosted profile)
- [x] Every hosted lab: 401 without a code or with a wrong one, 200 with any configured code; the local app never asks; no codes configured = closed (`http.test.js`)
- [ ] (live) after the first deploy with `LAB_ACCESS_TOKENS` set: `smoke-test.py` passes with the token, and the env-variables option really reaches the pod

## Capacity and abuse limits (hosted profile)
- [x] Seat cap per server → 503 + `Retry-After`, the page retries by itself
- [x] Per-IP cap on the rightmost `X-Forwarded-For` → 429; another address still gets a seat
- [x] 5 concurrent sessions with CPU burners and memory bombs at 0.5 CPU / 512Mi: a 6th visitor gets 503, the server keeps running
- [x] Memory pressure kills learner processes first (OOM score 1000 on every shell); one learner's fork bomb leaves another's session unaffected
- [x] `ulimit -u/-v/-f` really applied inside the shell (test reads them back) — the shell is bash because dash has no `ulimit -u`
- [ ] (live) autoscaling adds replicas under sustained CPU; `MIN_REPLICA` pre-scale before an announcement (see README)

## Security
- [x] Local profile refuses non-loopback `Host` (421) and cross-origin POST/WebSocket (403); hosted requires `Origin == Host`; POST and WS must carry an Origin
- [x] Loading a page never takes a seat; only a same-origin `POST /session` does
- [x] Each session is its own unprivileged user in a `0700` home; another session's files, processes and the sandbox root are off limits; `solutions/` unreadable from a lab
- [x] Session end kills the whole process session and every process of that user; home and command log deleted
- [x] Oversized frames/bodies rejected; one terminal per token; `exit` frees the seat
- [x] (live) cross-origin request against the real hostname is refused — `smoke-test.py` checks this

## Packaging and CI/CD
- [x] One Debian image for local and hosted; builds for `linux/amd64`; boots and passes the smoke test (emulated, `LAB_ULIMIT_V_KB=0` because x86 emulation cannot run under an address-space cap)
- [x] `docker compose up` (hardened: all capabilities dropped except those needed) passes the smoke test
- [x] Hygiene check: no other products named anywhere in the repo
- [ ] (live) push to `main` runs `deploy.yml` end to end: Terraform apply → build/push → EB deploy → wait for Ready → smoke test. Paths changed in the restructure; the first run is the real proof
- [ ] (live) `terraform fmt -check && terraform validate` in `deploy/infra` — only a comment changed there; CI runs it
