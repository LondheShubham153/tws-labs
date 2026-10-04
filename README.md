# TWS Labs

[![CI](https://github.com/TrainWithShubham/tws-labs/actions/workflows/ci.yml/badge.svg)](https://github.com/TrainWithShubham/tws-labs/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Learn **DevOps**, **Cloud** and **AI** by doing: a real terminal, real files, and tasks graded on the real state of a
real Linux sandbox. Not a simulator, not a quiz. Run it on your own machine — **Windows, macOS or Linux** — or use the
hosted version, which runs on [AWS Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html).
Labs are plain YAML and shell scripts, so anyone can contribute one.

The home page is a quiet map of three routes (**DevOps**, **Cloud**, **AI**) with a station for every topic. Topics with labs are
online; the rest are marked *next* or *later*. The syllabus and every topic's status live in `labs/roadmap.json`, adapted from the
TrainWithShubham DevOps roadmap.

| Route | Online today | Next |
|---|---|---|
| **DevOps** | Linux · Shell scripting · Git and GitHub | Docker · CI/CD with GitHub Actions · Networking |
| **Cloud** | Elastic Beanstalk Cluster Mode | AWS fundamentals · Kubernetes · Terraform on AWS |
| **AI** | — | Python for DevOps · Building AI agents · Agentic AI for DevOps |

## Run it locally

<p align="center"><img src="docs/screenshots/lab-terminal.png" alt="A TWS Labs lesson beside a live Linux terminal" width="900"></p>

**You need one thing: [Docker](https://www.docker.com/products/docker-desktop/)** (Docker Desktop on Windows and macOS, Docker Engine on Linux). No Node, no accounts. It is the same image the hosted version runs on Elastic Beanstalk, so what you run is what we host.

```bash
git clone https://github.com/TrainWithShubham/tws-labs
cd tws-labs
./start_local_labs.sh
```

The first run builds the image (a few minutes); after that it starts in seconds. Your browser opens at **http://localhost:8080**. Press `Ctrl+C` to stop; everything you did in a lab is thrown away with its sandbox.

| Your machine | How to run it |
|---|---|
| **macOS** | Install and open Docker Desktop, then run the commands above in Terminal. |
| **Linux** | Install Docker Engine with the compose plugin (your user must be able to run `docker`), then run the commands above. |
| **Windows** | Install Docker Desktop (WSL2 backend, the default) and [Git for Windows](https://git-scm.com/download/win). Open **Git Bash** and run the commands above. Using WSL instead? Run them inside your WSL distro with Docker Desktop's WSL integration on. |

Options:

```bash
LABS_PORT=9090 ./start_local_labs.sh     # port 8080 is busy
NO_BROWSER=1 ./start_local_labs.sh       # don't open the browser
./start_local_labs.sh stop               # stop and clean up from another terminal
```

Prefer plain Compose? `docker compose up --build` does the same thing.

**Troubleshooting**
- *"Docker is installed but not running"*: open Docker Desktop and wait for it to say it is running, then run the script again.
- *`bad interpreter` or `\r` errors on Windows*: Git converted line endings. The repo's `.gitattributes` prevents this on a fresh clone; if you cloned before that, run `git rm --cached -r . && git reset --hard`.
- *Permission denied on Linux*: add yourself to the docker group (`sudo usermod -aG docker $USER`, then log out and in), or run `chmod +x start_local_labs.sh`.
- *Port in use*: pick another with `LABS_PORT`.

## What you get

The home page is a quiet map of three routes; the roadmap lists every topic and its status.

<p align="center"><img src="docs/screenshots/home.png" alt="TWS Labs home page with the route map" width="49%"> <img src="docs/screenshots/roadmap.png" alt="The roadmap page" width="49%"></p>

## How it works

```
 browser ── lesson pane + xterm.js terminal
    │  HTTP + WebSocket
 container ── node server ──▶ a real bash (node-pty) per session, as its own unprivileged user
                  └─ "Check" runs the step's checks/<id>.sh against that sandbox
                     (files? git state? your shell's cwd? a running process?)   exit 0 = pass
```

- **Track → Lab → Steps.** A step is a *lesson* (read) or a *task* (do something, press Check).
- **One engine, two profiles.** `LAB_PROFILE=local` (compose) is loopback-only with relaxed limits and works fully offline.
  The default `hosted` profile adds per-IP seat limits, tight timeouts and a same-origin guard for the public deployment (`deploy/`).
- **Safety.** Each session is a separate unprivileged user with a private home; the container drops all capabilities it doesn't need,
  has CPU/memory/PID limits and a read-only root; requests must come from the page itself (a website you visit can't drive your shell);
  the answers (`solutions/`) are unreadable from inside a lab.
- **Invite codes.** On the hosted deployment every lab needs an invite code (the pages stay public); the local app never asks.
  See `deploy/README.md`.
- **Progress** (which labs you finished) lives in your browser's localStorage. No accounts.

## Contributing and security

Contributions are welcome, labs most of all: start with [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, follow
[SECURITY.md](SECURITY.md) (please don't open a public issue). The hosted version asks for an invite code; the local app never does.

**Community labs:** *Linux in Action* by [@Heyyprakhar1](https://github.com/Heyyprakhar1). Want yours here? Pick a topic from the [roadmap](labs/roadmap.json) and follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Add your own lab

No JavaScript needed — see [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/authoring.md](docs/authoring.md).

```bash
node scripts/new-lab.js linux-fundamentals my-lab "My lab title"        # scaffold (needs Node on the host)
# edit labs/linux-fundamentals/my-lab/{lab.yaml,checks,solutions}; refresh the browser to try it
docker compose run --rm labs node scripts/validate-labs.js --strict     # proves every task is solvable
```

## Roadmap and videos

`/roadmap` lists every topic by route, with its status and sub-topics; `/videos` collects the matching TrainWithShubham walkthroughs. Both are
built from `labs/roadmap.json`: change a topic's `status` or add a topic there, no code needed. A validator keeps it honest: a topic can only be
*live* if real labs sit behind it, and every lab must appear on the roadmap.

## Repo map

| Path | What |
|---|---|
| `labs/` | All lab content (`<track>/<lab>/{lab.yaml,setup.sh,checks/,solutions/}`), `roadmap.json` (syllabus + status), `site.yaml`, `lib.sh` (check helpers) |
| `src/` | The server: sessions, sandbox, loader, profiles, header/pages |
| `public/` | Browser code and the stylesheets |
| `start_local_labs.sh` | One-command local start for macOS, Linux and Windows (Git Bash / WSL) |
| `scripts/` | `validate-labs.js` (the contribution gate), `new-lab.js`, `check-hygiene.js` |
| `test/` | Unit and integration tests (the integration tests spawn real shells; they need Linux, i.e. the image) |
| `deploy/` | Hosted deployment on AWS Elastic Beanstalk Cluster Mode: Terraform, deploy scripts, smoke test |
| `docs/` | Authoring guide, Elastic Beanstalk research notes |

## Tests

```bash
npm ci && npm run test:unit          # fast, anywhere
docker compose run --rm -v "$PWD/test:/app/test:ro" labs sh -c 'node --test --test-force-exit test/unit/*.test.js test/integration/*.test.js'
```

## License

Code, labs and docs are released under the [MIT License](LICENSE). The TWS Labs name and logo (`public/logo/`) are not covered by it:
please don't use them to suggest your fork is the official one. The lab answers in `labs/**/solutions/` are public on purpose;
the hosted image keeps them out of the learner's shell, and the local app is for learning, not exams.
