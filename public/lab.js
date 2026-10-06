(function () {
  var DATA = JSON.parse(document.getElementById('lab-data').textContent);
  var STEPS = DATA.steps;
  var current = 0;
  var done = {};
  var token = null;
  var ws = null;
  var $ = function (id) { return document.getElementById(id); };

  // --- terminal --------------------------------------------------------------
  var pill = $('status-pill');
  function setStatus(cls, label) { pill.className = 'pill ' + cls; pill.textContent = label; }
  var term = new Terminal({
    convertEol: true, fontSize: 14, lineHeight: 1.35, cursorBlink: true,
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
    theme: {
      background: '#07070b', foreground: '#d8d7e2', cursor: '#8a63e8', cursorAccent: '#07070b',
      selectionBackground: 'rgba(139,92,246,0.35)',
      black: '#1a1a1a', red: '#f26d78', green: '#a6e22e', yellow: '#e6db74', blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#d4d4d4',
      brightBlack: '#666666', brightRed: '#f26d78', brightGreen: '#a6e22e', brightYellow: '#e6db74', brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f8f8f2',
    },
  });
  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($('term'));
  fit.fit();
  term.write(DATA.banner + '\r\n\r\n  \x1b[38;2;245;185;66mHappy Learning\x1b[0m\r\n\r\n');
  window.addEventListener('resize', function () { fit.fit(); sendSize(); });
  term.onData(function (d) { if (ws && ws.readyState === 1) ws.send(d); });
  function sendSize() { if (ws && ws.readyState === 1) ws.send('\u0000resize:' + term.cols + ',' + term.rows); }

  // --- session: the page shell takes no seat; we ask for one -------------------
  var tries = 0;
  var INVITE_KEY = 'tws:invite';
  function savedInvite() { try { return localStorage.getItem(INVITE_KEY) || ''; } catch (e) { return ''; } }
  function saveInvite(v) { try { if (v) localStorage.setItem(INVITE_KEY, v); else localStorage.removeItem(INVITE_KEY); } catch (e) { /* storage blocked */ } }
  // Gated labs (hosted only) ask for an invite code before taking a seat.
  function askInvite(wrong) {
    setStatus('ended', 'invite');
    $('term').hidden = true;
    var f = $('invite');
    f.hidden = false;
    $('invite-msg').textContent = wrong ? 'That code was not accepted. Try again.' : 'This lab runs on a shared cluster, so it needs an invite code.';
    $('invite-code').value = '';
    $('invite-code').focus();
  }
  $('invite').addEventListener('submit', function (e) {
    e.preventDefault();
    saveInvite($('invite-code').value.trim());
    $('invite').hidden = true; $('term').hidden = false; fit.fit();
    startSession();
  });
  function startSession() {
    if (DATA.gated && !savedInvite()) return askInvite(false);
    setStatus('', 'starting');
    var headers = { 'Content-Type': 'application/json' };
    if (savedInvite()) headers['X-Lab-Token'] = savedInvite();
    fetch('/session', { method: 'POST', headers: headers, body: JSON.stringify({ track: DATA.track, lab: DATA.lab }) })
      .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
      .then(function (r) {
        if (r.status === 200) { token = r.body.token; connect(); pollTimer(); setInterval(pollTimer, 5000); return; }
        if (r.status === 401) { var sent = !!savedInvite(); saveInvite(''); return askInvite(sent); }
        busy(r.body.message || 'No seat is free right now.');
      })
      .catch(function () { busy('Could not reach the server.'); });
  }
  function busy(message) {
    setStatus('ended', 'waiting');
    tries++;
    if (tries > 20) { term.write('\r\n\x1b[33m' + message + ' Reload the page to try again.\x1b[0m\r\n'); return; }
    term.write('\r\n\x1b[33m' + message + ' Retrying in a few seconds…\x1b[0m');
    setTimeout(startSession, 8000 + Math.random() * 7000);
  }
  function connect() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/ws?token=' + token);
    ws.onopen = function () { setStatus('live', 'live'); sendSize(); term.focus(); render(); };
    ws.onmessage = function (ev) { term.write(ev.data); };
    ws.onclose = function (ev) { setStatus('ended', 'ended'); term.write('\r\n[session ended: ' + (ev.reason || ev.code) + ']\r\n'); };
    ws.onerror = function () { setStatus('ended', 'error'); };
  }

  // --- steps -------------------------------------------------------------------
  // Progress is a thin route: one tick per step, the rocket parked at the current one.
  function renderDots() {
    var ticks = $('jticks'), n = STEPS.length;
    ticks.innerHTML = '';
    STEPS.forEach(function (st, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'jt' + (i === current ? ' is-active' : '') + (done[st.id] ? ' is-done' : '');
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + st.title + (done[st.id] ? ' (done)' : ''));
      if (i === current) b.setAttribute('aria-current', 'step');
      b.onclick = function () { current = i; render(); };
      ticks.appendChild(b);
    });
    $('journey').style.setProperty('--p', (n > 1 ? (current / (n - 1)) * 100 : 0) + '%');
  }
  function allDone() { return STEPS.every(function (s) { return done[s.id]; }); }

  function render() {
    var s = STEPS[current];
    var last = current === STEPS.length - 1;
    $('step-counter').textContent = 'Step ' + (current + 1) + ' of ' + STEPS.length + ' · ' + (s.type === 'task' ? 'task' : 'lesson');
    $('step-title').textContent = s.title;
    $('step-body').innerHTML = s.bodyHtml;          // server-rendered from escaped markdown
    setHint('', false);
    var btn = $('action-btn');
    btn.disabled = false;
    btn.style.display = '';
    if (done[s.id] && last) {
      btn.textContent = allDone() ? 'Finish' : 'Review skipped steps';
      btn.onclick = allDone() ? finish : function () { current = STEPS.findIndex(function (x) { return !done[x.id]; }); render(); };
    } else if (done[s.id]) { btn.textContent = 'Next →'; btn.onclick = next; }
    else if (s.type === 'lesson') { btn.textContent = 'Got it'; btn.onclick = function () { done[s.id] = true; if (last) render(); else { current++; render(); } }; }
    else { btn.textContent = 'Check'; btn.onclick = check; }
    $('back-btn').style.visibility = current === 0 ? 'hidden' : 'visible';
    $('skip-btn').style.visibility = last ? 'hidden' : 'visible';
    renderDots();
  }
  function next() { if (current < STEPS.length - 1) { current++; render(); } }
  $('back-btn').onclick = function () { if (current > 0) { current--; render(); } };
  $('skip-btn').onclick = next;

  // One live region for feedback: amber nudge when a check fails, green confirmation when it passes.
  function setHint(text, ok) { var h = $('step-hint'); h.textContent = text; h.classList.toggle('is-ok', !!ok); }

  function check() {
    var s = STEPS[current];
    var btn = $('action-btn');
    if (!token) { setHint('The terminal is still starting — try again in a moment.', false); return; }
    btn.textContent = 'Checking…'; btn.disabled = true;
    fetch('/lab/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, stepId: s.id }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.disabled = false;
        if (d.pass) { done[s.id] = true; render(); setHint(s.success || 'Correct. Step complete.', true); return; }
        btn.textContent = 'Not yet — try again';
        setHint(d.message || s.hint || '', false);
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Error — retry'; });
  }

  function finish() {
    window.twsMarkDone(DATA.track + '/' + DATA.lab);
    var html = '<p class="done-mark">Mission complete.</p><p>You finished <strong>' + esc(DATA.title) + '</strong>. Your progress is saved in this browser.</p>';
    if (DATA.resources.length) {
      html += '<ul class="resource-list">' + DATA.resources.map(function (r) {
        return '<li><a href="' + r.url + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + '</a><span>' + esc(r.desc) + '</span></li>';
      }).join('') + '</ul>';
    }
    html += '<div class="done-actions">' +
      (DATA.next ? '<a class="btn-primary" href="' + DATA.next.href + '">Next: ' + esc(DATA.next.title) + ' <span aria-hidden="true">&rarr;</span></a>' : '') +
      '<a class="btn-quiet" href="' + DATA.trackUrl + '">Back to the track</a></div>';
    STEPS.forEach(function (st) { done[st.id] = true; });
    current = STEPS.length - 1; renderDots();
    $('journey').style.setProperty('--p', '100%');
    $('journey').classList.add('launch');                 // the rocket leaves
    $('step-counter').textContent = 'Complete';
    $('step-title').style.display = 'none';
    $('step-body').innerHTML = html;
    setHint('', false);
    $('action-btn').style.display = 'none';
    $('skip-btn').style.visibility = 'hidden';
    $('back-btn').style.visibility = 'hidden';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // --- chrome ------------------------------------------------------------------
  function endLab() { try { if (ws) ws.close(1000, 'ended by learner'); } catch (e) { /* closed */ } location.href = DATA.trackUrl; }
  $('end-btn').onclick = endLab;
  $('fs-btn').onclick = function () {
    var el = document.querySelector('.terminal-pane');
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen();
  };
  window.addEventListener('beforeunload', function () { try { if (ws) ws.close(1000, 'page closed'); } catch (e) { /* closed */ } });

  function pollTimer() {
    if (!token) return;
    fetch('/session/remaining?token=' + token).then(function (r) { return r.json(); }).then(function (d) {
      var t = d.remainingSec, el = $('lab-timer');
      $('lab-timer-text').textContent = t <= 0 ? '00:00' : String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
      el.classList.toggle('is-low', t > 0 && t < 120);
    }).catch(function () { /* transient */ });
  }
  function pollStats() {
    fetch('/stats').then(function (r) { return r.json(); }).then(function (s) {
      $('stat-cpu').textContent = s.cpuPercent === null ? 'n/a' : s.cpuPercent + '%';
      $('stat-cpu-bar').style.width = (s.cpuPercent === null ? 0 : Math.min(100, s.cpuPercent)) + '%';
      $('stat-mem').textContent = s.memUsedMb + ' / ' + s.memLimitMb + ' MB';
      $('stat-mem-bar').style.width = Math.min(100, (s.memUsedMb / s.memLimitMb) * 100) + '%';
      $('stat-uptime').textContent = s.uptimeSec + 's';
    }).catch(function () { /* transient */ });
  }

  render();
  startSession();
  pollStats();
  setInterval(pollStats, 2000);
})();
