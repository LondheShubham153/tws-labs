# One image for every deployment: your laptop (docker compose) and the hosted
# Elastic Beanstalk environment. Build context is the repo root.
#
# build stage: node-pty compiles natively; keep the toolchain out of the final image.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# runtime: Debian on purpose - the same GNU coreutils/bash/git a learner meets on a
# real Ubuntu/Debian server. tini reaps orphaned lab processes (PID 1 duty); gosu
# drops each learner's shell to its own unprivileged user.
FROM node:22-bookworm-slim
# The slim base image strips manual pages at install time; lift that so `man ls` works for learners, then reinstall the
# base packages whose pages were already dropped (a reinstall puts them back).
RUN sed -i '\|path-exclude /usr/share/man/\*|d' /etc/dpkg/dpkg.cfg.d/docker \
 && apt-get update && apt-get install -y --no-install-recommends \
      bash coreutils procps git nano vim tree curl less file ca-certificates tini gosu \
      jq dnsutils iproute2 netcat-openbsd openssl man-db manpages \
 && apt-get install -y --no-install-recommends --reinstall \
      coreutils bash grep sed findutils gzip tar util-linux diffutils \
 && rm -rf /var/lib/apt/lists/* \
 # One user per concurrent session (lab0..lab15, uid 10000+): learners cannot read,
 # signal or starve each other. Names (not bare numbers) so `ls -l` stays readable.
 && for i in $(seq 0 15); do groupadd -g $((10000+i)) lab$i && useradd -M -u $((10000+i)) -g $((10000+i)) -s /bin/bash lab$i; done
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY labs ./labs
# Check scripts must stay readable (they run as the learner); the answers must not.
RUN find labs -type d -name solutions -exec chmod 700 {} +
ENV PORT=8080 SANDBOX_DIR=/sandbox LAB_UID=10000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
