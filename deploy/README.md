# Hosted deployment (AWS Elastic Beanstalk Cluster Mode)

This folder deploys the **same image** the repo's `docker compose up` runs, onto a live Elastic Beanstalk
Cluster Mode environment (`LAB_PROFILE` unset = the `hosted` profile). For the product itself — labs,
engine, local use — see the [root README](../README.md).

The environment is created on deploy and its hostname is random (look it up with `aws elasticbeanstalk describe-environments`),
so there is no fixed URL here. AWS resource names stay `beanstalk-grows-*` — see "Naming" below.

Repo: [`TrainWithShubham/tws-labs`](https://github.com/TrainWithShubham/tws-labs).

## What's here

- `infra/` — Terraform for the durable, well-supported foundational infrastructure: IAM roles, ECR repo,
  AWS Budget alert, the GitHub Actions OIDC deploy role, and the remote state backend.
- `01-create-roles.sh` … `04-teardown.sh` — the AWS CLI scripts that create/update/tear down the
  Beanstalk application and environment (`02` builds the image from the repo root and pushes it to ECR).
- `smoke-test.py` — end-to-end script run against the *live* URL as the final CI/CD gate; it walks the
  Elastic Beanstalk lab and a Linux lab through a real WebSocket terminal, and checks the cross-origin guard.
- `CHECKLIST.md` — production-readiness checklist; update it when you verify or break something.
- CI/CD (`.github/workflows/` at the repo root): `ci.yml` runs tests, validates every lab, builds the amd64
  image and checks Terraform on every PR. `deploy.yml` runs on push to `main` — `terraform apply`, build,
  push, deploy, then the live smoke test as the final gate.

## Why Terraform doesn't manage the Elastic Beanstalk environment itself

Elastic Beanstalk Cluster Mode is very new (shipped Sept 2026), and the Terraform AWS provider's
`aws_elastic_beanstalk_environment` resource doesn't support it yet — its `tier` argument only
accepts `Worker` or `WebServer`, confirmed against the provider's own docs source. Rather than
force this into Terraform via a fragile `null_resource`/`local-exec` workaround, the Beanstalk
application/environment is deployed by the same AWS CLI scripts used throughout this project's
development (`02-build-and-push.sh`, `03-deploy.sh`), now invoked *by* the CI/CD pipeline instead
of by hand. Terraform owns everything durable underneath it.

## On "GitOps"

True pull-based GitOps (an in-cluster controller like Argo CD/Flux reconciling from git) isn't
possible here — Cluster Mode deliberately gives the application no Kubernetes API access, so
nothing can run *inside* the cluster to reconcile against it. What's built instead is the
practical version most teams actually mean: git is the single source of truth, and merging to
`main` is the only path to production, enforced by a push-based pipeline (GitHub Actions).

## Naming

The product is called **TWS Labs** (previously "Climb," previously "Beanstalk Grows" — the
GitHub repo itself has been renamed twice too: `climb` → `tws-labs`). The underlying AWS
resources (`beanstalk-grows` application, `beanstalk-grows-env` environment, `beanstalk-grows`
ECR repo, `aws-elasticbeanstalk-eks-*-role` IAM roles, `climb-github-actions-deploy` IAM role,
`climb-terraform-*` state bucket/lock table) all keep their original names from before each
rename, to avoid tearing down and recreating already-verified live infrastructure for a cosmetic
change.

**Gotcha confirmed the hard way:** the GitHub OIDC trust policy on the deploy IAM role
(`infra/iam.tf`) is a `StringLike` condition scoped to `repo:<owner>*/<repo-name>*:ref:...` — it
embeds the *repo name*, not just an immutable ID. Renaming the GitHub repo without re-applying
Terraform (with the new `github_repo` var) breaks `configure-aws-credentials` in CI on the very
next run, because the trust policy still matches the old name. The deploy workflow already passes
`-var="github_repo=${{ github.repository }}"` (which resolves to the *current* name at runtime),
so this self-heals — but only once someone with standing AWS credentials runs `terraform apply`
once by hand first (same bootstrapping chicken-and-egg problem as the very first apply — CI can't
fix its own trust policy if it can't authenticate yet).

## Sandbox model (what a visitor can and cannot do)

Visitors get a real shell, so the container is hardened (`src/server.js`, `src/sandbox.js`, `Dockerfile`):

- The Node server runs as root only to start shells through `gosu` as a **per-session unprivileged user**
  (`lab0`…`lab15`, uid 10000+). Sessions cannot read, signal or starve each other; homes are `0700`; the
  answers (`labs/**/solutions/`) are root-only; a visitor can't `kill 1`, signal the server, or read its
  `/proc/<pid>/environ`. When a session ends, every process of its user is killed, including daemons that escaped the session.
- Per-shell `ulimit`s (now per user, so one visitor's fork bomb can't starve the others): 256 processes,
  256MB address space per process, 20MiB per file. **Residual risk:** nothing bounds *total* ephemeral disk in the
  EKS pod; a determined visitor can fill a replica's storage (compose uses a 128MB tmpfs for homes).
- `tini` is PID 1 so orphaned processes get reaped instead of piling up as zombies.
- Shell environment is whitelisted; WebSocket frames capped at 64KB; one terminal per token; sessions are
  minted by a same-origin `POST /session`, never by loading a page.

## Traffic spikes (read before announcing publicly)

Capacity is **seats per replica**: `MAX_SESSIONS` (5) × replicas. Autoscaling is CPU-driven and idle shells
use almost no CPU, so **a flood of visitors will not add replicas by itself** — extra visitors see a "seats are
taken" message in the lab and the page retries on its own (503 + `Retry-After`). Hosted now serves the Linux
and Git tracks too, so they share these seats. Before an announcement:

```bash
# e.g. 6 replicas = 30 seats; MAX_REPLICA is your hard spend ceiling
MIN_REPLICA=6 MAX_REPLICA=10 ./03-deploy.sh
# afterwards, scale back down
MIN_REPLICA=1 MAX_REPLICA=8 ./03-deploy.sh
```

- Per-IP limit: `MAX_SESSIONS_PER_IP` (default 3, counts unconnected tokens) so one bot can't burn every
  seat. It's the *rightmost* `X-Forwarded-For` entry (the ALB's). Campus/classroom NATs share an address —
  raise it if a cohort is behind one. The image provides 16 learner users, so `MAX_SESSIONS` above 16 needs more users in the `Dockerfile`.
- Watch seat pressure per replica at `/stats` (`sessions`, `maxSessions`).
- Sessions are in-memory per replica; ALB stickiness (30 min) keeps a visitor on theirs. A replica
  replacement drops its sessions — visitors just start a new lab.
- **Budget:** the default `$5/month` alert predates Cluster Mode's real cost (EKS control plane alone ≈
  $0.10/hr ≈ $73/month while the environment exists). It also alerts on *forecast* and 100%-actual, and the
  limit is a variable (`-var budget_limit_usd=...`). Set it to what you actually intend to spend.

## Invite codes
Every lab on the hosted app refuses to start a session without an invite code, so a stray link cannot burn cluster
capacity. The pages themselves (home, roadmap, lab shells) stay public; the local app never asks.

- Tokens live in the GitHub repo secret `LAB_ACCESS_TOKENS` (comma-separated, one per cohort so one can be revoked alone):
  `openssl rand -base64 18 | gh secret set LAB_ACCESS_TOKENS` (add more with commas by setting the whole value again).
- `deploy.yml` passes it to `03-deploy.sh`, which sets the `env-variables` option (`aws:elasticbeanstalk:eks:environment`)
  to `{"LAB_ACCESS_TOKENS": ...}`. The smoke test sends the first token and checks that no code and a wrong code get 401.
- **No secret set = every hosted lab is closed to everyone** (fail closed), and the deploy prints a warning.
- Learners enter the code once; the browser remembers it (`localStorage`).
- Caveats: the value is visible to anyone who can `describe-configuration-settings` on the environment, and changing it
  rolls the pods, which ends live sessions - rotate between events. Removing the secret does not clear an already-set
  `env-variables` option; set `LAB_ACCESS_TOKENS` to a new value instead.

## Cost guardrail

An AWS Budget is codified in `infra/budget.tf` (limit = `budget_limit_usd`, default $5 — too low for a
live Cluster Mode environment, see "Traffic spikes"). It alerts at 80% actual, 100% forecast and 100%
actual. See bootstrap below for bringing the hand-created budget under Terraform management.

## Bootstrap (one-time, by hand)

Terraform state lives in S3 (`climb-terraform-state-<account-id>`, locked via the
`climb-terraform-lock` DynamoDB table — see `infra/state-backend.tf`) rather than locally. This
turned out not to be optional: a CI run starts from a blank checkout every time, so without shared
state it tried to recreate every already-existing resource from scratch on its first real run,
failing against the deliberately least-privileged deploy role. Bootstrap order: apply once with a
temporary local backend to create the state bucket/table, then switch `providers.tf` to the `s3`
backend and run `terraform init -migrate-state`.

CI can't create its own permission to run before it has any AWS credentials, so the very first
`terraform apply` — which creates the GitHub OIDC provider and deploy role — has to be run by a
human once:

```bash
cd infra
# The state bucket name embeds the AWS account ID, so it is passed at init, never committed:
terraform init -backend-config="bucket=climb-terraform-state-$(aws sts get-caller-identity --query Account --output text)"
# The deploy role trusts EXACTLY this repo (owner and repo IDs, no wildcards):
OWNER_ID=$(gh api repos/<owner>/<repo> --jq .owner.id); REPO_ID=$(gh api repos/<owner>/<repo> --jq .id)
terraform plan \
  -var="github_repo=<owner>/<repo>" -var="github_owner_id=$OWNER_ID" -var="github_repo_id=$REPO_ID" \
  -var="budget_notification_email=<your-email>"
# review the plan, then the same command with `apply`
```

The IAM roles, ECR repo, and budget already exist (created by hand earlier in this project) —
bring them under Terraform management instead of recreating them:

```bash
terraform import aws_iam_role.cluster aws-elasticbeanstalk-eks-cluster-role
terraform import aws_iam_role.node aws-elasticbeanstalk-eks-node-role
terraform import aws_iam_role.observability aws-elasticbeanstalk-eks-observability-role
terraform import aws_ecr_repository.app beanstalk-grows
terraform import aws_budgets_budget.climb_demo <account-id>:beanstalk-grows-demo
```

After that, set these as repo variables (Settings → Secrets and variables → Actions → Variables)
for `deploy.yml` to use: `AWS_DEPLOY_ROLE_ARN` (from the `terraform apply` output),
`AWS_REGION`, `BUDGET_NOTIFICATION_EMAIL` (the smoke test looks the environment hostname up itself). Every apply after the bootstrap one
is pipeline-driven — **except** a GitHub repo rename, which needs one more manual apply to update
the OIDC trust policy (see the "Naming" gotcha above); the deploy pipeline itself can't recover
from that on its own since it can't authenticate to AWS until the trust policy already matches.

## Manual run order (what the pipeline automates)

```bash
./01-create-roles.sh    # one-time: cluster/node/observability IAM roles
./02-build-and-push.sh  # build the image from the repo root, push to ECR
./03-deploy.sh           # create or update the Cluster Mode environment
./04-teardown.sh         # terminate + verify nothing billable remains
```

## What's tuned for cost

- `cpu=500m`, `memory=512Mi` per replica.
- `max-replica=8` with CPU-utilization autoscaling (50% threshold) — cheap at idle, scales for
  the "make it grow" lab step.
- No CodeBuild step — the image is pre-built and pushed directly, not built from source.
