// Page bodies for the app. The shared chrome (header, frame) comes from ui.page().
const { esc, ext, YT_ICON, rocket } = require('./ui');
const { onMap, later } = require('./roadmap');
const { ASCII_BANNER } = require('./banner');

const mins = (ms) => Math.round(ms / 60000);

function notFoundBody() {
  return `<div class="wrap"><span class="eyebrow">404</span><h1 class="page-title">Off course.</h1>
    <p class="lede">That page isn&rsquo;t on the map.</p><p style="margin-top:28px"><a class="btn-primary" href="/">Back to base <span aria-hidden="true">&rarr;</span></a></p></div>`;
}

const RUN_STEPS = ['git clone https://github.com/TrainWithShubham/tws-labs', 'cd tws-labs', './start_local_labs.sh'];
const OS_TABS = [
  { id: 'windows', label: 'Windows', note: 'Needs <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer">Docker Desktop</a> (WSL2) and Git for Windows. Run in Git Bash (or any WSL terminal).' },
  { id: 'macos', label: 'macOS', note: 'Needs <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer">Docker Desktop</a>. Run in Terminal.' },
  { id: 'linux', label: 'Linux', note: 'Needs Docker Engine with the Compose plugin. Run in any terminal.' },
];
const lineClass = (id) => `line-${/^(devops|cloud|ai)$/.test(id) ? id : 'more'}`;
const STATUS_TAG = { live: 'online', building: 'building', next: 'next', later: 'later' };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const labsMeta = (t) => `${plural(t.labs.length, 'lab')} · ${t.labs.reduce((m, l) => m + l.minutes, 0)} min`;

// Hero illustration: one thin orbit per line, carrying that line's real roadmap topics as stations.
// Live stations are lit and labelled, upcoming ones are hollow rings, and a single rocket glides on the middle orbit.
function orbitArt(domains) {
  const TILT = -13 * Math.PI / 180, CX = 280, CY = 214;
  const SIZES = [[104, 62], [186, 108], [262, 148]];
  const local = (rx, ry, t) => [rx * Math.cos(t), ry * Math.sin(t)];
  const screen = ([x, y]) => [CX + x * Math.cos(TILT) - y * Math.sin(TILT), CY + x * Math.sin(TILT) + y * Math.cos(TILT)];
  let orbits = '', stations = '', labels = '', names = '';
  domains.slice(0, 3).forEach((d, i) => {
    const [rx, ry] = SIZES[i];
    const topics = d.topics.filter((t) => t.status !== 'later').slice(0, 6);
    const phase = [0.35, 2.35, 4.0][i];
    orbits += `<ellipse rx="${rx}" ry="${ry}" class="orbit ${lineClass(d.id)}"/>`;
    topics.forEach((t, k) => {
      const p = local(rx, ry, phase + (k / Math.max(topics.length, 1)) * Math.PI * 2);
      const st = t.status === 'live' ? 'live' : t.status === 'building' ? 'building' : 'next';
      stations += `<g class="st ${lineClass(d.id)}" data-status="${st}" transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})">${st === 'live' ? '<circle r="12" class="halo"/>' : ''}<circle r="7" class="ring"/>${st === 'live' ? '<circle r="2.8" class="core"/>' : ''}</g>`;
      if (t.status === 'live') {                      // label sits just outside the orbit, away from the hub, so labels never collide
        const [sx, sy] = screen(p), dx = sx - CX, dy = sy - CY, len = Math.hypot(dx, dy) || 1;
        const lx = sx + (dx / len) * 20, ly = sy + (dy / len) * 20;
        labels += `<text class="lbl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" dy=".35em" text-anchor="${dx >= 0 ? 'start' : 'end'}">${esc(t.short)}</text>`;
      }
    });
    const [nx, ny] = screen(local(rx, ry, -Math.PI * 0.5 + 0.0));
    names += `<text class="orbit-name ${lineClass(d.id)}" x="${nx.toFixed(1)}" y="${(ny - 9).toFixed(1)}" text-anchor="middle">${esc(d.title)}</text>`;
  });
  const [rx2, ry2] = SIZES[1];
  const path = `M${-rx2} 0 a${rx2} ${ry2} 0 1 1 ${2 * rx2} 0 a${rx2} ${ry2} 0 1 1 ${-2 * rx2} 0`;
  return `<svg viewBox="0 0 560 428" role="img" aria-label="Three orbits - DevOps, Cloud and AI - with a station for each topic and a rocket on its way">
    <g transform="translate(${CX} ${CY}) rotate(-13)">${orbits}${stations}
      <g class="rocket-run"><g transform="rotate(45)"><svg x="-13" y="-13" width="26" height="26" viewBox="0 0 24 24" style="color:#7b52c3"><use href="#rocket"/></svg></g>
        <animateMotion dur="50s" repeatCount="indefinite" rotate="auto" path="${path}"/></g>
      <g class="hub"><circle r="16" class="hub-ring"/><circle r="5" class="hub-dot"/></g>
    </g>${labels}${names}</svg>`;
}

function homeBody(catalog, roadmap, cfg) {
  const problems = [...catalog.problems, ...roadmap.problems];
  const warn = problems.length
    ? `<div class="warn"><strong>${problems.length} content problem(s)</strong><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : '';
  const domains = roadmap.domains;
  const titleOf = (id) => (domains.find((d) => d.id === id) || {}).title || '';
  const firstLive = domains.flatMap((d) => d.topics).find((t) => t.status === 'live' && t.labs.length);
  const startHref = firstLive ? firstLive.href : '/';

  const columns = domains.map((d) => {
    const shown = onMap(d), hidden = later(d).length;
    const items = shown.map((t) => {
      const interchange = t.also.length && t.status !== 'live' ? ` <span class="also">&#8644; ${esc(t.also.map(titleOf).join(', '))}</span>` : '';
      const head = `<i class="stn-dot"></i><b>${esc(t.title)}</b><small>${t.status === 'live' ? esc(labsMeta(t)) : `<span class="tag">${STATUS_TAG[t.status]}</span>${interchange}`}</small>`;
      return t.status === 'live' && t.href
        ? `<li data-status="live"><a href="${t.href}" data-labs="${esc(t.labs.map((l) => l.track + '/' + l.id).join(','))}">${head}</a></li>`
        : `<li data-status="${t.status}" class="dim"><div class="item">${head}</div></li>`;
    }).join('');
    return `
      <div class="col ${lineClass(d.id)} reveal">
        <h3>${esc(d.title)}</h3><p>${esc(d.tagline)}</p>
        <ol class="route">${items}</ol>
        ${hidden ? `<a class="more" href="/roadmap#${esc(d.id)}">${hidden} more on the roadmap &rarr;</a>` : ''}
      </div>`;
  }).join('');

  const tabs = OS_TABS.map((t, i) => `<button role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`).join('');
  const panels = OS_TABS.map((t, i) => `
        <div role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}" ${i === 0 ? '' : 'hidden'}>
          <p class="run-note">${t.note}</p>
          <div class="codeblock"><pre><code>${RUN_STEPS.map((l) => `<span class="ln"><b>$</b> ${esc(l)}</span>`).join('')}</code></pre>
            <button class="copy" type="button" data-copy="${esc(RUN_STEPS.join('\n'))}">Copy</button></div>
        </div>`).join('');

  const note = cfg.isLocal
    ? `Running locally &middot; bound to localhost &middot; ${mins(cfg.idleMs)}-minute idle timeout`
    : `Hosted playground &middot; a private user per session &middot; ${mins(cfg.idleMs)}-minute idle timeout`;

  const body = `
<main class="home">
  <section class="hero">
    <div class="hero-copy">
      <span class="eyebrow">TWS Labs</span>
      <h1>Learn <span class="u line-devops">DevOps</span>, <span class="u line-cloud">Cloud</span> &amp; <span class="u line-ai">AI</span><br/><em>by doing.</em></h1>
      <p class="lede">Real terminals. Real feedback. Every lab is graded on what actually happened.</p>
      <div class="cta"><a class="btn-primary" href="${startHref}">Launch the first lab <span aria-hidden="true">&rarr;</span></a><a class="btn-quiet" href="#map">See the map</a></div>
    </div>
    <div class="hero-art">${orbitArt(domains)}</div>
  </section>

  ${warn}

  <section class="section" id="map" aria-labelledby="maph">
    <div class="section-head reveal"><span class="eyebrow">The map</span><h2 id="maph">Choose a route.</h2></div>
    <div class="cols">${columns}</div>
  </section>

  <section class="section" aria-labelledby="how">
    <div class="section-head reveal"><span class="eyebrow">How it works</span><h2 id="how">Not a tutorial. A lab.</h2></div>
    <div class="steps">
      <div class="reveal"><span class="n">01</span><h3>A real terminal</h3><p>A genuine Linux shell, as its own user. Break things safely.</p><code>$ uname -sr</code></div>
      <div class="reveal"><span class="n">02</span><h3>Graded on real state</h3><p>Check inspects your sandbox. However you got there, the state is what counts.</p><code>[ -x deploy.sh ] &#10003;</code></div>
      <div class="reveal"><span class="n">03</span><h3>Your machine or ours</h3><p>The same labs offline in Docker, or hosted.</p><code>$ ./start_local_labs.sh</code></div>
    </div>
  </section>

  <section class="section run" id="run" aria-labelledby="runh">
    <div class="run-grid">
      <div class="reveal"><span class="eyebrow">Run it locally</span><h2 id="runh">On your own machine.</h2><p class="lede">Docker is all you need.</p></div>
      <div class="runbox reveal"><div class="tabs-os" role="tablist" aria-label="Operating system">${tabs}</div>${panels}
        <p class="run-after">Then open <a href="http://localhost:8080">localhost:8080</a>.</p></div>
    </div>
  </section>

  <section class="final reveal">
    <span class="rk-big">${rocket()}</span>
    <h2>Reach orbit.</h2>
    <a class="btn-primary" href="${startHref}">Launch the first lab <span aria-hidden="true">&rarr;</span></a>
    <p class="fine">${note}<br/><a href="/roadmap">Roadmap</a> &middot; <a href="/videos">Videos</a> &middot; <a href="https://github.com/TrainWithShubham/tws-labs">Source</a></p>
  </section>
</main>`;
  return {
    body,
    head: '<script>document.documentElement.classList.add("js")</script><link rel="stylesheet" href="/home.css" />',
    scripts: '<script src="/progress.js"></script><script src="/home.js"></script>',
  };
}

// ---- Videos: every walkthrough on the roadmap, by line ---------------------------------------------------------
function videosBody(roadmap, site) {
  const sections = roadmap.domains.map((d) => {
    const rows = d.topics.filter((t) => t.video).map((t) => `
        <li data-status="${t.status}"><i class="stn-dot"></i>
          <a class="vtitle" href="${esc(t.video.url)}" target="_blank" rel="noopener noreferrer">${esc(t.video.title)}</a>
          <span class="vtopic">${esc(t.title)}</span>
          ${t.status === 'live' && t.href ? `<a class="open" href="${t.href}">Practice &rarr;</a>` : `<span class="tag">${STATUS_TAG[t.status]}</span>`}</li>`).join('');
    return rows ? `<section class="vsec ${lineClass(d.id)}"><h2>${esc(d.title)}</h2><ul class="vlist">${rows}</ul></section>` : '';
  }).join('');
  return `<div class="wrap videos"><span class="eyebrow">Videos</span><h1 class="page-title">Watch, then do.</h1>
    <p class="lede">Every walkthrough on the roadmap. Where a lab is online, practise it right after.</p>${sections}
    <p class="src"><a href="${esc(site.channel.url)}" target="_blank" rel="noopener noreferrer">More on ${esc(site.channel.name)} &rarr;</a></p></div>`;
}

// ---- Roadmap: the whole syllabus, grouped by line, collapsed by default -------------------------------------
const FILTER_OF = { live: 'live', building: 'next', next: 'next', later: 'later' };
function roadmapBody(roadmap) {
  const warn = roadmap.problems.length
    ? `<div class="warn"><strong>${roadmap.problems.length} roadmap problem(s)</strong><ul>${roadmap.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : '';
  const titleOf = (id) => (roadmap.domains.find((d) => d.id === id) || {}).title || '';
  const sections = roadmap.domains.map((d) => {
    const rows = d.topics.map((t) => {
      const meter = t.relevance != null ? `<span class="meter" title="Job relevance ${t.relevance}%"><i style="--v:${t.relevance}%"></i></span>` : '<span class="meter"></span>';
      const subs = t.subtopics.length ? `<p class="subs">${t.subtopics.map(esc).join(' &middot; ')}</p>` : '';
      const also = t.also.length ? `<span class="also">&#8644; ${esc(t.also.map(titleOf).join(', '))}</span>` : '';
      const video = t.video ? `<a class="vlink" href="${esc(t.video.url)}" target="_blank" rel="noopener noreferrer">${YT_ICON}<span>${esc(t.video.title)}</span></a>` : '';
      const open = t.status === 'live' && t.href ? `<a class="open" href="${t.href}">Open &rarr;</a>` : '';
      return `<details class="topic" data-status="${t.status}" data-filter="${FILTER_OF[t.status]}">
          <summary><i class="stn-dot"></i><span class="t"><b>${esc(t.title)}</b>${also}</span>${meter}<span class="tag">${STATUS_TAG[t.status]}</span></summary>
          <div class="body">${subs}<div class="acts">${open}${video}</div></div>
        </details>`;
    }).join('');
    const caps = d.capstones.length ? `<div class="caps"><span class="eyebrow">Capstones</span><ul>${d.capstones.map((c) => `<li><b>${esc(c.title)}</b><small>${esc(c.stack)}</small></li>`).join('')}</ul></div>` : '';
    return `<section class="rm-domain ${lineClass(d.id)}" id="${esc(d.id)}" data-domain>
      <h2>${esc(d.title)}</h2><p class="tagline">${esc(d.tagline)}</p>
      <div class="topics">${rows}</div>${caps}</section>`;
  }).join('');
  const src = roadmap.source ? `<p class="src">Adapted from the ${esc(roadmap.source.sheet)} syllabus &middot; updated ${esc(roadmap.source.importedAt)}</p>` : '';
  return `<div class="wrap roadmap">
    <span class="eyebrow">Roadmap</span>
    <h1 class="page-title">What&rsquo;s built, and what&rsquo;s next.</h1>
    <p class="lede">Every topic on the map, and the ones still ahead.</p>
    <div class="filters" role="group" aria-label="Filter by status"><button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="live" aria-pressed="false">Online</button><button type="button" data-f="next" aria-pressed="false">Next</button><button type="button" data-f="later" aria-pressed="false">Later</button></div>
    ${warn}${sections}${src}
  </div>`;
}

// Which line (and topic) a track belongs to, so every page can carry the same accent and breadcrumb.
function placeOf(roadmap, trackId) {
  for (const d of roadmap.domains) {
    for (const t of d.topics) if (t.labs.some((l) => l.track === trackId)) return { domain: d, topic: t };
  }
  return null;
}
// The lab to suggest after finishing one: the next in its track, else the first lab of the next track.
function nextLab(catalog, trackId, labId) {
  const ti = catalog.tracks.findIndex((t) => t.id === trackId);
  const track = catalog.tracks[ti];
  if (!track) return null;
  const li = track.labs.findIndex((l) => l.id === labId);
  const sameTrack = track.labs[li + 1];
  if (sameTrack) return { href: `/lab/${track.id}/${sameTrack.id}`, title: sameTrack.title };
  const other = catalog.tracks[ti + 1];
  return other && other.labs[0] ? { href: `/lab/${other.id}/${other.labs[0].id}`, title: other.labs[0].title } : null;
}
const crumb = (parts) => `<p class="crumb">${parts.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`)).join('<i>/</i>')}</p>`;

function videoBanner(v) {
  return v ? `<div class="video-banner"><span class="yt-badge">${YT_ICON}</span><div><strong>Watch first: ${ext(v.url, esc(v.title))}</strong><br/><small>${esc(v.note)}</small></div></div>` : '';
}

function trackBody(track, place) {
  const line = place ? lineClass(place.domain.id) : 'line-more';
  const items = track.labs.map((l) => `
      <li data-status="live"><a href="/lab/${track.id}/${l.id}" data-labs="${track.id}/${l.id}"><i class="stn-dot"></i>
        <b>${esc(l.title)}</b><small>${esc(l.summary)} &middot; ${l.minutes} min &middot; ${esc(l.level)}</small></a></li>`).join('');
  const parts = [['Labs', '/']];
  if (place) parts.push([place.domain.title, `/roadmap#${place.domain.id}`]);
  parts.push([track.title, '']);
  const video = track.video
    ? `<a class="vlink" href="${esc(track.video.url)}" target="_blank" rel="noopener noreferrer">${YT_ICON}<span>Watch first: ${esc(track.video.title)}</span></a>` : '';
  return `<div class="wrap track ${line}">${crumb(parts)}
    <h1 class="page-title">${esc(track.title)}</h1><p class="lede">${esc(track.description)}</p>
    <div class="track-meta"><span class="meta" data-track-progress="${track.id}" data-labs="${track.labs.map((l) => l.id).join(',')}"></span>${video}</div>
    <ol class="route labs">${items}</ol></div>`;
}

const STAT = (id, label) => `<div class="stat-cell"><div class="stat-label">${label}</div><div class="stat-value" id="stat-${id}">&mdash;</div>${id === 'uptime' ? '' : `<div class="stat-bar"><div class="stat-bar-fill" id="stat-${id}-bar"></div></div>`}</div>`;

// The lab page is a seatless shell: it embeds the steps and the client mints its
// own session with POST /session. Nothing about GET /lab/... takes a seat.
function labBody(lab, trackTitle, cfg, place, next) {
  const data = {
    track: lab.track, lab: lab.id, title: lab.title, trackUrl: '/t/' + lab.track,
    local: cfg.isLocal, gated: !cfg.isLocal, banner: ASCII_BANNER,
    links: lab.links, resources: lab.resources, next,
    steps: lab.steps.map((s) => ({
      id: s.id, type: s.type, title: s.title, hint: s.hint, success: s.success,
      bodyHtml: (cfg.isLocal && s.localBodyHtml) || s.bodyHtml,
    })),
  };
  // JSON in a script tag: neutralise "<" so content can never close the tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const links = lab.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a>`).join('');
  return {
    body: `
  <div class="lab-shell ${place ? lineClass(place.domain.id) : 'line-more'}">
    <div class="tasks-pane">
      ${crumb([['Labs', '/'], ...(place ? [[place.domain.title, `/roadmap#${place.domain.id}`]] : []), [trackTitle, `/t/${lab.track}`]])}
      <div class="tasks-header"><h1 class="lab-title">${esc(lab.title)}</h1><div class="lab-timer" id="lab-timer" title="Time left in this session"><span id="lab-timer-text">--:--</span></div></div>
      <nav class="journey" id="journey" aria-label="Lab progress"><span class="jline"><i></i></span><span class="jticks" id="jticks"></span><span class="jrocket" aria-hidden="true">${rocket()}</span></nav>
      <div class="step-counter" id="step-counter"></div>
      <div class="step-card">
        <div class="step-title" id="step-title"></div>
        <div class="step-body" id="step-body"></div>
        <div class="step-hint" id="step-hint" role="status"></div>
        <div class="step-footer">
          <button class="btn link" id="back-btn">&larr; Back</button>
          <button class="btn link" id="skip-btn">Skip &rarr;</button>
          <span class="spacer"></span>
          <button class="btn primary" id="action-btn"></button>
        </div>
      </div>
      <button class="btn danger" id="end-btn">End lab</button>
    </div>
    <div class="terminal-pane">
      <div class="terminal-tab"><span id="status-pill" class="pill">starting</span> Terminal
        <span class="terminal-links">${links}<button class="fullscreen-btn" id="fs-btn" title="Fullscreen" aria-label="Fullscreen">&#x26F6;</button></span></div>
      <form class="invite" id="invite" hidden autocomplete="off">
        <label for="invite-code">Invite code</label>
        <p id="invite-msg">This lab runs on a shared cluster, so it needs an invite code.</p>
        <div class="invite-row"><input id="invite-code" type="password" spellcheck="false" autocapitalize="off" required /><button class="btn primary" type="submit">Start</button></div>
      </form>
      <div id="term"></div>
    </div>
  </div>
  <div class="stats-box" id="stats-box">${STAT('cpu', 'CPU')}${STAT('mem', 'Memory')}${STAT('uptime', 'Uptime')}<div class="stats-note-cell">${esc(cfg.ownerNote)}</div></div>`,
    scripts: `<link rel="stylesheet" href="/xterm/xterm.css" />
  <script id="lab-data" type="application/json">${json}</script>
  <script src="/xterm/xterm.js"></script><script src="/xterm/addon-fit.js"></script><script src="/progress.js"></script><script src="/lab.js"></script>`,
  };
}

module.exports = { notFoundBody, homeBody, roadmapBody, videosBody, trackBody, labBody, placeOf, nextLab };
