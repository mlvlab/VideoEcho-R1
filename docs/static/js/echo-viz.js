// Interactive figures for the Echo-GRPO project page. No external libraries.
// Data: window.ECHO_TRACE (echo-data.js: per-token log p / importance ratio of the running example),
//       window.ECHO_CURVES (echo-curves.js: W&B training curves). Other numbers are the paper's.
(function () {
  'use strict';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sv(parent, name, attrs, text) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; parent.appendChild(e); return e; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function btn(cls, html, fn) { var b = h('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; }
  function onVisible(el, fn, thr) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { threshold: thr || 0.35 });
    io.observe(el);
  }
  function pressed(group, pick) { group.forEach(function (b) { b.setAttribute('aria-pressed', String(b === pick)); }); }
  var COL = { grpo: '#9a927a', mixed: '#c0392b', echo: '#2b4f9e', green: '#2e8b62', grey: '#a0a1a5' };

  /* ---- loss shading follows the paper's Fig. 2b palette (cream -> salmon -> red) on -log p ---- */
  var ANCH = [[0, [247, 243, 232]], [0.6, [252, 232, 223]], [1.5, [255, 220, 211]], [3, [255, 147, 146]], [4.5, [253, 113, 114]]];
  function lossColor(v) {
    if (v <= 0) return 'rgb(' + ANCH[0][1] + ')';
    for (var i = 1; i < ANCH.length; i++) if (v <= ANCH[i][0]) {
      var a = ANCH[i - 1], b = ANCH[i], t = (v - a[0]) / (b[0] - a[0]);
      return 'rgb(' + a[1].map(function (x, j) { return Math.round(x + (b[1][j] - x) * t); }) + ')';
    }
    return 'rgb(' + ANCH[ANCH.length - 1][1] + ')';
  }
  var KEY = /robot|scrap|mechanical/i;
  function isSpace(s) { return /^\s*$/.test(s); }
  function clipped(trace, t, eps) { return trace.A > 0 && t[2] > 1 + (eps == null ? 0.3 : eps); }
  // render a trace into a container as token chips; returns the chips (with .dataset.i)
  function layTokens(box, trace, cls) {
    box.innerHTML = ''; var chips = [];
    trace.tokens.forEach(function (t, i) {
      var s = t[0];
      if (isSpace(s)) { if (s.indexOf('\n') >= 0 && chips.length) box.append(h('br')); return; }
      if (/^\s*\n/.test(s) && chips.length) box.append(h('br'));
      var sp = h('span', (cls || 'tk') + (KEY.test(s) ? ' key' : ''), esc(s.replace(/\n/g, '').trim()));
      sp.dataset.i = i; box.append(sp); chips.push(sp);
      if (/\n$/.test(s)) box.append(h('br'));
    });
    return chips;
  }

  /* =====================================================================
     1. HERO: the two traces are typed out, each token lit by how unlikely
        it is for the student. Mixed-Policy ends with clipped tokens stamped.
     ===================================================================== */
  function initHero(root) {
    var D = window.ECHO_TRACE; if (!D) return;
    var cols = h('div', 'hero-cols');
    var panes = {};
    [['mixed', 'Mixed-Policy GRPO', 'privileged trace from the teacher'], ['echo', 'Echo-GRPO (ours)', 'the same reasoning in the model’s own idiolect']].forEach(function (c) {
      var p = h('div', 'hero-pane ' + c[0]);
      p.append(h('div', 'hp-h', '<b>' + c[1] + '</b><span>' + c[2] + '</span>'));
      var m = h('div', 'hp-meters', '<div class="hp-m"><b class="lp">&ndash;</b><span>mean log p under the student</span></div><div class="hp-m"><b class="rare">0</b><span>tokens the student would rarely say</span></div><div class="hp-m clipm"><b class="cl">&ndash;</b><span>clipped in the update</span></div>');
      var box = h('div', 'hp-text');
      p.append(m, box); cols.append(p);
      panes[c[0]] = { pane: p, box: box, lp: m.querySelector('.lp'), rare: m.querySelector('.rare'), cl: m.querySelector('.cl') };
    });
    var ctl = h('div', 'hero-ctl');
    var play = btn('tv-play', '<i class="fa-solid fa-play"></i> Play');
    var legend = h('div', 'tv-legend', '<span><i class="ramp"></i>unlikely under the student (&minus;log p, low &rarr; high)</span><span><i class="g"></i>clipped: no gradient</span><span><u>robot</u>: the reasoning behind the answer</span>');
    ctl.append(play, legend);
    root.append(cols, ctl);
    var timer = null;
    function run() {
      clearInterval(timer);
      var S = {};
      ['mixed', 'echo'].forEach(function (k) { S[k] = { chips: layTokens(panes[k].box, D[k]), i: 0, sum: 0, n: 0, rare: 0 }; panes[k].pane.classList.remove('done'); panes[k].cl.textContent = '–'; panes[k].lp.textContent = '–'; panes[k].rare.textContent = '0'; });
      var speed = REDUCED ? 1e9 : 3;
      function step(k) {
        var s = S[k], tr = D[k];
        for (var q = 0; q < speed && s.i < s.chips.length; q++, s.i++) {
          var sp = s.chips[s.i], t = tr.tokens[+sp.dataset.i];
          sp.style.background = lossColor(-t[1]); sp.classList.add('on');
          s.sum += t[1]; s.n++; if (t[1] < -3) { s.rare++; sp.classList.add('rare'); }
        }
        panes[k].lp.textContent = (s.sum / Math.max(1, s.n)).toFixed(2); panes[k].rare.textContent = s.rare;
        if (s.i >= s.chips.length && !s.done) {
          s.done = true; var n = 0;
          s.chips.forEach(function (sp) { var t = tr.tokens[+sp.dataset.i]; if (clipped(tr, t)) { n++; sp.classList.add('clip'); } });
          panes[k].cl.textContent = n; panes[k].pane.classList.add('done'); panes[k].pane.classList.toggle('bad', n > 0); panes[k].pane.classList.toggle('good', n === 0);
          panes[k].box.scrollTop = 0;
        } else if (s.i % 12 === 0) { var last = s.chips[Math.max(0, s.i - 1)]; if (last && last.offsetTop > panes[k].box.scrollTop + panes[k].box.clientHeight - 60) panes[k].box.scrollTop = last.offsetTop - 120; }
      }
      timer = setInterval(function () { step('mixed'); step('echo'); if (S.mixed.done && S.echo.done) { clearInterval(timer); play.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Replay'; } }, 28);
      if (REDUCED) { step('mixed'); step('echo'); }
    }
    play.onclick = run;
    onVisible(root, run, 0.3);
  }

  /* =====================================================================
     2. PIPELINE: GRPO group, Mixed-Policy swap, Echo-GRPO paraphrase (SVG)
     ===================================================================== */
  function initPipeline(root) {
    var W = 980, H = 360;
    var ctl = h('div', 'pp-ctl');
    var modes = [['grpo', 'GRPO'], ['mixed', 'Mixed-Policy GRPO'], ['echo', 'Echo-GRPO (ours)']];
    var tabs = h('div', 'tv-tabs'), tb = {};
    modes.forEach(function (m) { tb[m[0]] = btn('tv-tab', m[1], function () { setMode(m[0]); }); tabs.append(tb[m[0]]); });
    var play = btn('tv-play', '<i class="fa-solid fa-play"></i> Run one step');
    ctl.append(tabs, play);
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'pp-svg'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'GRPO pipeline: video and question go to the policy, which samples six rollouts; each is rewarded and the group update trains the policy.');
    var cap = h('p', 'tv-cap');
    root.append(ctl, svg, cap);
    var defs = sv(svg, 'defs', {});
    var mk = sv(defs, 'marker', { id: 'pp-arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    sv(mk, 'path', { d: 'M0 0L10 5L0 10z', fill: '#8a919e' });
    function box(x, y, w, h_, cls, lines, extra) {
      var g = sv(svg, 'g', { class: 'pp-box ' + cls, transform: 'translate(' + x + ',' + y + ')' });
      sv(g, 'rect', { width: w, height: h_, rx: 10 });
      lines.forEach(function (l, i) { sv(g, 'text', { x: w / 2, y: h_ / 2 + (i - (lines.length - 1) / 2) * 17 + 5, 'text-anchor': 'middle', class: i ? 'sub' : 'main' }, l); });
      if (extra) extra(g, w, h_); return g;
    }
    function arrow(x1, y1, x2, y2, cls) { return sv(svg, 'path', { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, class: 'pp-arrow ' + (cls || ''), 'marker-end': 'url(#pp-arr)' }); }
    // input
    var inG = sv(svg, 'g', { class: 'pp-in' });
    sv(inG, 'image', { href: 'static/videos/robot_clip_poster.jpg', x: 20, y: 95, width: 150, height: 84, preserveAspectRatio: 'xMidYMid slice', rx: 8 });
    sv(inG, 'rect', { x: 20, y: 95, width: 150, height: 84, rx: 8, fill: 'none', stroke: '#cdd1d6' });
    sv(inG, 'text', { x: 95, y: 200, 'text-anchor': 'middle', class: 'pp-lbl' }, 'video v + question q');
    arrow(175, 137, 205, 137);
    box(210, 105, 130, 64, 'policy', ['Policy πθ', 'VideoLLM']);
    // rollouts
    var RX = 400, RW = 190, RH = 34, RY0 = 30, GAP = 10, rolls = [], rews = [];
    for (var i = 0; i < 6; i++) {
      var y = RY0 + i * (RH + GAP);
      arrow(345, 137, RX - 5, y + RH / 2, 'thin');
      rolls.push(box(RX, y, RW, RH, 'roll r' + i, ['y' + '₁₂₃₄₅₆'[i] + '  own rollout']));
      arrow(RX + RW + 4, y + RH / 2, RX + RW + 34, y + RH / 2, 'thin');
      rews.push(box(RX + RW + 38, y, 52, RH, 'rew', ['R' + '₁₂₃₄₅₆'[i]]));
    }
    var groupBox = sv(svg, 'rect', { x: RX - 10, y: RY0 - 10, width: RW + 20, height: 6 * (RH + GAP) + 10, rx: 12, class: 'pp-group' });
    svg.insertBefore(groupBox, svg.childNodes[1]);
    arrow(RX + RW + 94, 137, RX + RW + 124, 137);
    var upd = box(RX + RW + 128, 97, 190, 80, 'update', ['GRPO update', 'group-relative advantage', 'trust-region clipping']);
    // loop back
    sv(svg, 'path', { d: 'M' + (RX + RW + 223) + ' 97 V 9 H 275 V 101', class: 'pp-arrow', 'marker-end': 'url(#pp-arr)', fill: 'none' });
    sv(svg, 'text', { x: 262, y: 70, 'text-anchor': 'end', class: 'pp-lbl' }, 'updated policy');
    // teacher + DRD (hidden unless needed)
    var y6 = RY0 + 5 * (RH + GAP) + RH / 2;
    var teacher = box(20, 250, 150, 56, 'teacher hidden', ['Teacher πT', 'privileged trace ỹ']);
    var tArrow = arrow(175, 278, RX - 5, y6, 'teach hidden');
    var drd = box(210, 250, 130, 56, 'drd hidden', ['Dual-Reference', 'Decoding']);
    var dArrow1 = arrow(175, 278, 205, 278, 'teach hidden');
    var dArrow2 = arrow(345, 278, RX - 5, y6, 'teach hidden');
    // clip stamps inside the 6th rollout
    var stamps = sv(svg, 'g', { class: 'pp-stamps hidden', transform: 'translate(' + (RX + 6) + ',' + (RY0 + 5 * (RH + GAP) + RH + 6) + ')' });
    for (var s = 0; s < 22; s++) sv(stamps, 'rect', { x: s * 8.2, y: 0, width: 6, height: 6, rx: 1, class: 'st' + (([3, 9, 10, 15, 19].indexOf(s) >= 0) ? ' clip' : '') });
    var mode = 'grpo', timers = [];
    function clearT() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, t) { timers.push(setTimeout(fn, REDUCED ? 0 : t)); }
    function setMode(m) {
      mode = m; pressed(Object.keys(tb).map(function (k) { return tb[k]; }), tb[m]);
      svg.setAttribute('data-mode', m);
      var sixth = rolls[5].querySelector('text');
      sixth.textContent = m === 'grpo' ? 'y₆  own rollout' : m === 'mixed' ? 'ỹ  privileged trace' : 'y_rewrite  paraphrase';
      teacher.classList.toggle('hidden', m === 'grpo'); tArrow.classList.toggle('hidden', m !== 'mixed');
      drd.classList.toggle('hidden', m !== 'echo'); dArrow1.classList.toggle('hidden', m !== 'echo'); dArrow2.classList.toggle('hidden', m !== 'echo');
      run();
    }
    function run() {
      clearT(); svg.classList.remove('s1', 's2', 's3'); stamps.classList.add('hidden');
      later(function () { svg.classList.add('s1'); }, 150);
      later(function () { svg.classList.add('s2'); }, 1100);
      later(function () { svg.classList.add('s3'); stamps.classList.toggle('hidden', mode !== 'mixed'); }, 2000);
      cap.innerHTML = mode === 'grpo'
        ? '<b>GRPO.</b> The policy samples six reasoning traces, each gets a reward, and the update favors the traces that beat the group average. Every trace comes from the model itself, so it can only reinforce reasoning it already produces.'
        : mode === 'mixed'
          ? '<b>Mixed-Policy GRPO.</b> One rollout is replaced by a privileged trace &#7929; from a stronger teacher. It is correct and rewarded, but its tokens are off-policy: in the update, the grey ones leave the trust region and get <b>no gradient</b>.'
          : '<b>Echo-GRPO.</b> Dual-Reference Decoding first rewrites &#7929; into the model&rsquo;s own idiolect. The paraphrase keeps the meaning but stays on-policy, so nothing is clipped and the reasoning is actually learned.';
    }
    play.onclick = run;
    setMode('grpo');
  }

  /* =====================================================================
     3. EPSILON: drag the trust region and watch which tokens get clipped
     ===================================================================== */
  function initEpsilon(root) {
    var D = window.ECHO_TRACE; if (!D) return;
    var eps = 0.3;
    var top = h('div', 'ep-top');
    var lab = h('label', 'ep-lab', 'Clip threshold&nbsp; 1&thinsp;+&thinsp;&epsilon; = <b>1.30</b>');
    var sl = h('input'); sl.type = 'range'; sl.min = '0.05'; sl.max = '0.6'; sl.step = '0.05'; sl.value = '0.3'; sl.className = 'ep-range'; sl.setAttribute('aria-label', 'clip epsilon');
    top.append(lab, sl);
    var W = 760, H = 230, PL = 40, PB = 34, PT = 14, PR = 14;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'ep-svg');
    var stats = h('div', 'ep-stats');
    var sM = h('div', 'tv-m bad', '<b>0</b><span>clipped in the privileged trace</span>'), sE = h('div', 'tv-m good', '<b>0</b><span>clipped in the paraphrase</span>');
    stats.append(sM, sE);
    var words = h('div', 'ep-words'); var cap = h('p', 'tv-cap');
    root.append(top, svg, stats, words, cap);
    // bins on log r in [0.5, 2.2], overflow bin for r > 2.2
    var LO = Math.log(0.5), HI = Math.log(2.2), NB = 34;
    function binOf(r) { var v = Math.log(Math.max(r, 0.5)); if (v >= HI) return NB; return Math.min(NB - 1, Math.floor((v - LO) / (HI - LO) * NB)); }
    function content(tr) { return tr.tokens.filter(function (t) { return !isSpace(t[0]); }); }
    var series = [['mixed', COL.mixed], ['echo', COL.echo]];
    var counts = series.map(function (s) { var c = new Array(NB + 1).fill(0); content(D[s[0]]).forEach(function (t) { c[binOf(t[2])]++; }); return c; });
    var maxC = Math.max.apply(null, counts.map(function (c) { return Math.max.apply(null, c); }));
    var x = function (i) { return PL + i * (W - PL - PR) / (NB + 1.6); }, bw = (W - PL - PR) / (NB + 1.6) - 1.5;
    var y = function (c) { return H - PB - Math.sqrt(c / maxC) * (H - PB - PT); };
    var shade = sv(svg, 'rect', { x: 0, y: PT, width: 0, height: H - PB - PT, class: 'ep-shade' });
    sv(svg, 'line', { x1: PL, x2: W - PR, y1: H - PB, y2: H - PB, class: 'ep-axis' });
    [0.5, 0.8, 1, 1.3, 1.6, 2].forEach(function (v) { var xx = x(binOf(v) + 0.5); sv(svg, 'text', { x: xx, y: H - PB + 18, 'text-anchor': 'middle', class: 'ep-tick' }, v.toString()); });
    sv(svg, 'text', { x: x(NB) + bw / 2, y: H - PB + 18, 'text-anchor': 'middle', class: 'ep-tick' }, '>2.2');
    sv(svg, 'text', { x: W - PR, y: H - 4, 'text-anchor': 'end', class: 'ep-tick' }, 'importance ratio r̂ of each token (count, sqrt scale)');
    var bars = series.map(function (s, si) {
      return counts[si].map(function (c, i) { return sv(svg, 'rect', { x: x(i) + (si ? bw / 2 : 0), y: y(c), width: bw / 2, height: H - PB - y(c), fill: s[1], class: 'ep-bar', opacity: c ? 1 : 0 }); });
    });
    var epsLine = sv(svg, 'line', { y1: PT, y2: H - PB, class: 'ep-line' });
    var epsTxt = sv(svg, 'text', { y: PT + 12, class: 'ep-eps' }, '1+ε');
    sv(svg, 'rect', { x: PL, y: PT, width: 12, height: 10, fill: COL.mixed }); sv(svg, 'text', { x: PL + 16, y: PT + 9, class: 'ep-tick' }, 'privileged trace');
    sv(svg, 'rect', { x: PL + 120, y: PT, width: 12, height: 10, fill: COL.echo }); sv(svg, 'text', { x: PL + 136, y: PT + 9, class: 'ep-tick' }, 'idiolectal paraphrase');
    function draw() {
      lab.querySelector('b').textContent = (1 + eps).toFixed(2);
      var xe = x(binOf(1 + eps)); epsLine.setAttribute('x1', xe); epsLine.setAttribute('x2', xe); epsTxt.setAttribute('x', xe + 4);
      shade.setAttribute('x', xe); shade.setAttribute('width', W - PR - xe);
      bars.forEach(function (bs, si) { bs.forEach(function (b, i) { b.classList.toggle('out', i >= binOf(1 + eps) && counts[si][i] > 0); }); });
      var nM = content(D.mixed).filter(function (t) { return clipped(D.mixed, t, eps); }), nE = content(D.echo).filter(function (t) { return clipped(D.echo, t, eps); });
      sM.querySelector('b').textContent = nM.length; sE.querySelector('b').textContent = nE.length;
      words.innerHTML = nM.length ? '<span class="ep-wl">clipped words in the privileged trace:</span>' + nM.map(function (t) { return '<span class="ep-w' + (KEY.test(t[0]) ? ' key' : '') + '">' + esc(t[0].trim()) + '<small>' + t[2].toFixed(2) + '</small></span>'; }).join('') : '<span class="ep-wl">nothing is clipped at this threshold.</span>';
      var rob = nM.filter(function (t) { return /robot/i.test(t[0]); }).length;
      cap.innerHTML = eps >= 0.5
        ? 'Even with the trust region widened to <b>1+&epsilon; = ' + (1 + eps).toFixed(2) + '</b>, the privileged trace still has <b>' + nM.length + '</b> clipped tokens' + (rob ? ' including &ldquo;robot&rdquo;' : '') + '. The paper observes the same: the problem is structural, not a hyper-parameter.'
        : 'At <b>1+&epsilon; = ' + (1 + eps).toFixed(2) + '</b> (&epsilon;<sub>high</sub> = 0.3 is the training value), <b>' + nM.length + '</b> tokens of the privileged trace are clipped' + (rob ? ', including &ldquo;robot&rdquo; (' + rob + '&times;)' : '') + ', while the paraphrase keeps all of its tokens inside the trust region.';
    }
    sl.oninput = function () { eps = parseFloat(sl.value); draw(); };
    draw();
  }

  /* =====================================================================
     4. DRD stepper (paper Fig. 3 numbers)
     ===================================================================== */
  var DRD = [
    { slot: 0, dist: [['bag', 56.4], ['yellow', 34.3], ['box', 1.9], ['towel', 1.5]], sem: [['box', 99.9], ['small', 0.01], ['boxed', 0.01], ['rect', 0.0]],
      note: 'Left alone, the model would say <b>&ldquo;bag&rdquo;</b>, which contradicts the trace. The semantic reference only allows tokens faithful to &#7929;, so <b>&ldquo;box&rdquo;</b> wins.' },
    { slot: 1, dist: [['visible', 80.9], ['first', 12.4], ['shown', 2.4], ['seen', 1.0]], sem: [['shown', 55.3], ['visible', 43.0], ['first', 0.7], ['reveal', 0.0]],
      note: 'The trace says <b>&ldquo;shown&rdquo;</b>, but <b>&ldquo;visible&rdquo;</b> means the same and is what the model would naturally say, so the product picks <b>&ldquo;visible&rdquo;</b>.' }
  ];
  function initDRD(root) {
    var timer = null, chain = null;
    var ctl = h('div', 'dr-ctl');
    var play = btn('tv-play', '<i class="fa-solid fa-play"></i> Decode');
    var b0 = btn('tv-tab', 'Step 1 &middot; bag &rarr; box', function () { show(0); }), b1 = btn('tv-tab', 'Step 2 &middot; shown &rarr; visible', function () { show(1); });
    ctl.append(play, b0, b1);
    var sent = h('div', 'dr-sent'), cols = h('div', 'dr-cols');
    function col(title, sub, cls) { var c = h('div', 'dr-col ' + cls); c.append(h('div', 'dr-h', title + '<small>' + sub + '</small>')); var l = h('div', 'dr-list'); c.append(l); return [c, l]; }
    var cD = col('Distributional reference', '&pi;<sub>&theta;0</sub>(&middot; | v, q) &middot; no trace', 'd');
    var cS = col('Semantic reference', 'top-k &pi;<sub>&theta;0</sub>(&middot; | v, q, &#7929;)', 's');
    var cP = col('Product of experts', 'normalized D &times; S', 'p');
    cols.append(cD[0], h('div', 'dr-op', '&times;'), cS[0], h('div', 'dr-op', '='), cP[0]);
    var note = h('p', 'tv-cap');
    root.append(ctl, sent, cols, note);
    function renderSent(done) {
      sent.innerHTML = 'The person &hellip; is putting down a <span class="slot' + (done >= 1 ? ' fill' : '') + '">' + (done >= 1 ? 'box' : '&#9633;') + '</span>, which is <span class="slot' + (done >= 2 ? ' fill' : '') + '">' + (done >= 2 ? 'visible' : '&#9633;') + '</span> in their hands &hellip;';
    }
    function rows(list, items, fmt) {
      list.innerHTML = '';
      return items.map(function (it) { var r = h('div', 'dr-row'); r.innerHTML = '<span class="w">' + it[0] + '</span><span class="b"><i></i></span><span class="v">' + fmt(it[1]) + '</span>'; list.append(r); r._w = Math.max(1.5, it[1]); r._tok = it[0]; return r; });
    }
    function show(i) {
      clearTimeout(timer); clearTimeout(chain); var S = DRD[i];
      pressed([b0, b1], i ? b1 : b0); renderSent(i);
      var semMap = {}; S.sem.forEach(function (x) { semMap[x[0]] = x[1]; });
      var prod = S.sem.map(function (x) { var d = (S.dist.filter(function (y) { return y[0] === x[0]; })[0] || [0, 0])[1]; return [x[0], d * x[1]]; });
      var Z = prod.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
      prod = prod.map(function (x) { return [x[0], x[1] / Z * 100]; }).sort(function (a, b) { return b[1] - a[1]; });
      var pct = function (v) { return v >= 0.1 ? v.toFixed(1) : v > 0 ? '<0.1' : '0.0'; };
      var rd = rows(cD[1], S.dist, pct), rs = rows(cS[1], S.sem, pct), rp = rows(cP[1], prod, pct);
      rd.forEach(function (r) { if (!(r._tok in semMap)) r.classList.add('out'); });
      var win = prod[0][0];
      [rd, rs, rp].forEach(function (g) { g.forEach(function (r) { r.querySelector('i').style.width = '0%'; }); });
      cP[0].classList.remove('lit'); note.innerHTML = '';
      var seq = [function () { rd.forEach(function (r) { r.querySelector('i').style.width = r._w + '%'; }); },
                 function () { rs.forEach(function (r) { r.querySelector('i').style.width = r._w + '%'; }); },
                 function () { rp.forEach(function (r) { r.querySelector('i').style.width = r._w + '%'; if (r._tok === win) r.classList.add('win'); }); cP[0].classList.add('lit'); },
                 function () { renderSent(i + 1); note.innerHTML = S.note; }];
      if (REDUCED) { seq.forEach(function (f) { f(); }); return; }
      var j = 0; (function next() { seq[j++](); if (j < seq.length) timer = setTimeout(next, 650); })();
    }
    play.onclick = function () { show(0); chain = setTimeout(function () { show(1); }, REDUCED ? 0 : 3400); };
    renderSent(0);
    onVisible(root, function () { play.onclick(); }, 0.45);
  }

  /* =====================================================================
     5. TRAINING CURVES: metric tabs, smoothing, hover readout (W&B exports)
     ===================================================================== */
  function initCurves(root) {
    var C = window.ECHO_CURVES; if (!C) return;
    var METRICS = [['accuracy', 'Training accuracy'], ['reward', 'Overall reward'], ['confidence', 'Confidence (mean log p per token)'], ['clipped', '# samples with clipped tokens']];
    var SER = [['GRPO', COL.grpo], ['Mixed-Policy GRPO', COL.mixed], ['Echo-GRPO', COL.echo]];
    var metric = 'accuracy', smooth = true, on = { 'GRPO': true, 'Mixed-Policy GRPO': true, 'Echo-GRPO': true };
    var tabs = h('div', 'tv-tabs'), tb = {};
    METRICS.forEach(function (m) { tb[m[0]] = btn('tv-tab', m[1], function () { metric = m[0]; draw(); }); tabs.append(tb[m[0]]); });
    var right = h('div', 'cv-right');
    var sm = btn('chip', 'smoothed', function () { smooth = !smooth; sm.setAttribute('aria-pressed', String(smooth)); draw(); }); sm.setAttribute('aria-pressed', 'true');
    var leg = h('div', 'cv-legend');
    SER.forEach(function (s) { var b = btn('cv-key', '<i style="background:' + s[1] + '"></i>' + s[0], function () { on[s[0]] = !on[s[0]]; b.classList.toggle('off', !on[s[0]]); draw(); }); leg.append(b); });
    right.append(leg, sm);
    var bar = h('div', 'cv-bar'); bar.append(tabs, right);
    var W = 860, H = 300, PL = 54, PR = 16, PT = 16, PB = 36;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'cv-svg');
    var tip = h('div', 'cv-tip'); tip.hidden = true;
    var cap = h('p', 'tv-cap');
    var wrap = h('div', 'cv-wrap'); wrap.append(svg, tip);
    root.append(bar, wrap, cap);
    function ema(ys, a) { var o = [], p = ys[0]; ys.forEach(function (v, i) { p = i ? a * p + (1 - a) * v : v; o.push(p); }); return o; }
    var gGrid = sv(svg, 'g', {}), gLines = sv(svg, 'g', {}), gHover = sv(svg, 'g', { class: 'cv-hover hidden' });
    var hl = sv(gHover, 'line', { y1: PT, y2: H - PB, class: 'cv-hl' }); var dots = SER.map(function (s) { return sv(gHover, 'circle', { r: 4.5, fill: s[1], stroke: '#fff', 'stroke-width': 1.5 }); });
    var cur = {};
    function draw() {
      pressed(Object.keys(tb).map(function (k) { return tb[k]; }), tb[metric]);
      gGrid.innerHTML = ''; gLines.innerHTML = '';
      var data = C[metric], xs = data['GRPO'].x, lo = Infinity, hi = -Infinity; cur = {};
      SER.forEach(function (s) { if (!on[s[0]]) return; var ys = smooth ? ema(data[s[0]].y, metric === 'clipped' ? 0.85 : 0.9) : data[s[0]].y; cur[s[0]] = ys; ys.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
      if (!isFinite(lo)) return;
      var pad = (hi - lo) * 0.08 || 0.01; lo -= pad; hi += pad;
      var X = function (i) { return PL + i / (xs.length - 1) * (W - PL - PR); }, Y = function (v) { return H - PB - (v - lo) / (hi - lo) * (H - PB - PT); };
      for (var g = 0; g <= 4; g++) { var v = lo + (hi - lo) * g / 4, yy = Y(v); sv(gGrid, 'line', { x1: PL, x2: W - PR, y1: yy, y2: yy, class: 'cv-grid' }); sv(gGrid, 'text', { x: PL - 8, y: yy + 4, 'text-anchor': 'end', class: 'cv-tick' }, metric === 'clipped' ? v.toFixed(0) : v.toFixed(2)); }
      [0, 25, 50, 75, 100, 125, 149].forEach(function (i) { sv(gGrid, 'text', { x: X(i), y: H - PB + 18, 'text-anchor': 'middle', class: 'cv-tick' }, xs[i]); });
      sv(gGrid, 'text', { x: (PL + W - PR) / 2, y: H - 4, 'text-anchor': 'middle', class: 'cv-tick' }, 'training step');
      SER.forEach(function (s) { if (!cur[s[0]]) return; var d = cur[s[0]].map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); var p = sv(gLines, 'path', { d: d, stroke: s[1], class: 'cv-line' + (s[0] === 'Echo-GRPO' ? ' ours' : '') }); if (!REDUCED) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset 1.1s ease'; p.style.strokeDashoffset = 0; } });
      svg._X = X; svg._Y = Y; svg._xs = xs;
      var notes = { accuracy: 'Mixed-Policy starts higher but learns slowly; Echo-GRPO keeps improving and ends highest.', reward: 'Mixed-Policy stalls early, while Echo-GRPO sustains the increase.', confidence: 'Echo-GRPO preserves confidence; GRPO declines steadily and Mixed-Policy collapses in the early stages.', clipped: 'Mixed-Policy GRPO keeps clipping many samples throughout training; Echo-GRPO stays well below it.' };
      cap.innerHTML = '<b>' + METRICS.filter(function (m) { return m[0] === metric; })[0][1] + '.</b> ' + notes[metric] + ' Hover for values.';
    }
    svg.addEventListener('mousemove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, xs = svg._xs; if (!xs) return;
      var i = Math.round((px - PL) / (W - PL - PR) * (xs.length - 1)); if (i < 0 || i >= xs.length) { gHover.classList.add('hidden'); tip.hidden = true; return; }
      gHover.classList.remove('hidden'); var xx = svg._X(i); hl.setAttribute('x1', xx); hl.setAttribute('x2', xx);
      var html = '<b>step ' + xs[i] + '</b>';
      SER.forEach(function (s, k) { if (!cur[s[0]]) { dots[k].setAttribute('opacity', 0); return; } dots[k].setAttribute('opacity', 1); dots[k].setAttribute('cx', xx); dots[k].setAttribute('cy', svg._Y(cur[s[0]][i])); html += '<span><i style="background:' + s[1] + '"></i>' + s[0] + ' <em>' + (metric === 'clipped' ? cur[s[0]][i].toFixed(1) : cur[s[0]][i].toFixed(3)) + '</em></span>'; });
      tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 6) + 'px'; tip.style.top = (e.clientY - r.top - 10) + 'px';
    });
    svg.addEventListener('mouseleave', function () { gHover.classList.add('hidden'); tip.hidden = true; });
    draw();
  }

  /* =====================================================================
     6. RESULTS explorer (paper Table 2), absolute or delta-vs-GRPO
     ===================================================================== */
  var BENCH = ['VideoMMMU', 'MMVU (mc)', 'Video-Holmes', 'VSI-Bench', 'VideoMME', 'Avg.'];
  var RES = {
    'InternVL3.5-4B': [['Base', 43.4, 57.4, 33.9, 37.5, 55.4, 45.5], ['+ SFT', 54.1, 59.0, 40.9, 42.5, 57.4, 50.8], ['+ GRPO', 50.4, 61.1, 40.0, 46.7, 56.5, 50.9], ['+ SFT → GRPO', 49.8, 61.3, 39.4, 37.8, 57.6, 49.2], ['+ Mixed-Policy GRPO', 49.3, 58.4, 38.8, 41.2, 55.0, 48.5], ['VideoEcho-R1', 55.3, 65.1, 41.0, 44.0, 57.9, 52.7]],
    'Qwen3-VL-4B': [['Base', 55.2, 62.7, 33.5, 34.7, 55.6, 48.3], ['+ SFT', 48.2, 62.9, 40.8, 38.2, 58.2, 49.7], ['+ GRPO', 56.8, 68.0, 43.3, 50.8, 60.7, 55.9], ['+ SFT → GRPO', 57.5, 66.2, 44.0, 42.7, 59.6, 54.0], ['+ Mixed-Policy GRPO', 42.1, 41.9, 23.6, 35.2, 54.5, 39.5], ['VideoEcho-R1', 59.1, 68.8, 46.7, 50.9, 60.7, 57.2]],
    'Qwen3-VL-8B': [['Base', 56.3, 60.6, 36.5, 40.2, 60.0, 50.7], ['+ SFT', 57.0, 71.0, 42.7, 39.8, 60.7, 54.2], ['+ GRPO', 62.6, 71.5, 44.7, 51.1, 61.0, 58.2], ['+ SFT → GRPO', 61.7, 69.9, 44.6, 46.6, 60.6, 56.7], ['+ Mixed-Policy GRPO', 60.1, 71.5, 43.1, 35.8, 57.5, 53.6], ['VideoEcho-R1', 63.6, 72.3, 45.1, 49.1, 61.1, 58.2]]
  };
  function initResults(root) {
    var bb = 'Qwen3-VL-4B', bi = 5, delta = false;
    var t1 = h('div', 'tv-tabs rx-bb'), t2 = h('div', 'rx-chips'), tbs = [], chips = [];
    Object.keys(RES).forEach(function (k) { var b = btn('tv-tab', k, function () { bb = k; draw(); }); b.dataset.k = k; tbs.push(b); t1.append(b); });
    BENCH.forEach(function (n, i) { var b = btn('chip', n, function () { bi = i; draw(); }); b.dataset.i = i; chips.push(b); t2.append(b); });
    var dl = btn('chip alt', '&Delta; vs. GRPO', function () { delta = !delta; dl.setAttribute('aria-pressed', String(delta)); draw(); }); t2.append(dl);
    var chart = h('div', 'rx-chart'), cap = h('p', 'tv-cap');
    root.append(t1, t2, chart, cap);
    var rowsEl = RES[bb].map(function (r) { var row = h('div', 'rx-row' + (r[0] === 'VideoEcho-R1' ? ' ours' : '')); row.innerHTML = '<span class="n">' + r[0] + '</span><span class="b"><s></s><i></i><em></em></span>'; chart.append(row); return row; });
    function draw() {
      pressed(tbs, tbs.filter(function (b) { return b.dataset.k === bb; })[0]); pressed(chips, chips[bi]);
      var R = RES[bb], g0 = R[2][bi + 1], vals = R.map(function (r) { return delta ? r[bi + 1] - g0 : r[bi + 1]; });
      var best = Math.max.apply(null, vals);
      if (delta) {
        var m = Math.max.apply(null, vals.map(Math.abs)) || 1;
        R.forEach(function (r, j) { var v = vals[j], row = rowsEl[j], i = row.querySelector('i'), em = row.querySelector('em');
          row.classList.add('delta'); row.classList.toggle('neg', v < 0); row.classList.toggle('best', v === best);
          i.style.left = v < 0 ? (50 - Math.abs(v) / m * 48) + '%' : '50%'; i.style.width = (Math.abs(v) / m * 48) + '%'; em.textContent = (v > 0 ? '+' : '') + v.toFixed(1); });
      } else {
        var lo = Math.floor((Math.min.apply(null, vals) - 6) / 5) * 5, hi = Math.max.apply(null, vals) + 2;
        R.forEach(function (r, j) { var v = vals[j], row = rowsEl[j], i = row.querySelector('i'); row.classList.remove('delta', 'neg'); row.classList.toggle('best', v === best);
          i.style.left = 0; i.style.width = ((v - lo) / (hi - lo) * 100) + '%'; row.querySelector('em').textContent = v.toFixed(1); });
      }
      var o = R[5][bi + 1], mx = R[4][bi + 1];
      cap.innerHTML = '<b>' + bb + ' &middot; ' + BENCH[bi] + ':</b> VideoEcho-R1 ' + o.toFixed(1) + ' (' + (o - g0 >= 0 ? '+' : '') + (o - g0).toFixed(1) + ' vs. GRPO, ' + (o - mx >= 0 ? '+' : '') + (o - mx).toFixed(1) + ' vs. Mixed-Policy GRPO).' + (delta ? ' Bars show the difference from GRPO.' : '');
    }
    draw();
  }

  /* =====================================================================
     7. QUALITATIVE RACE: the two answers are typed in sync with the video
     ===================================================================== */
  function initRace(root) {
    var video = root.querySelector('video'); var boxes = root.querySelectorAll('.race-box'); if (!video || !boxes.length) return;
    var texts = Array.prototype.map.call(boxes, function (b) { var t = b.querySelector('.race-t'); var full = t.textContent; t.textContent = ''; return { el: t, full: full, box: b }; });
    var play = root.querySelector('.race-play');
    var FRAC = 0.8; // typing finishes at 80% of the clip, the verdict stamps at the end
    function set(p) {
      texts.forEach(function (t) { var n = Math.floor(Math.min(1, p / FRAC) * t.full.length); t.el.textContent = t.full.slice(0, n); t.box.classList.toggle('typing', n < t.full.length); t.box.classList.toggle('verdict', p >= 0.98); });
    }
    video.addEventListener('timeupdate', function () { if (video.duration) set(video.currentTime / video.duration); });
    video.addEventListener('ended', function () { set(1); });
    if (play) play.onclick = function () { video.currentTime = 0; set(0); video.play(); };
    if (REDUCED) set(1); else set(0);
  }

  /* =====================================================================
     8. Scroll reveal, count-up, active nav link
     ===================================================================== */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (!REDUCED) {
      var els = document.querySelectorAll('.fig, .card, .stat, .pstep, .table-wrap, .video-card, .quote');
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
      els.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
      document.querySelectorAll('.stat .n').forEach(function (el) {
        var txt = el.textContent, nums = txt.match(/[\d.]+/g); if (!nums) return;
        onVisible(el, function () { var t0 = performance.now(), dur = 900; (function tick(t) { var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3), i = 0; el.textContent = txt.replace(/[\d.]+/g, function (m) { var v = parseFloat(nums[i++]), dec = (m.split('.')[1] || '').length; return (v * e).toFixed(dec); }); if (p < 1) requestAnimationFrame(tick); else el.textContent = txt; })(t0); }, 0.6);
      });
    }
    var links = document.querySelectorAll('.navlinks a[href^="#"]'), secs = [];
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) secs.push([s, a]); });
    var nav = new IntersectionObserver(function (es) { es.forEach(function (e) { var a = secs.filter(function (p) { return p[0] === e.target; })[0]; if (a && e.isIntersecting) { links.forEach(function (l) { l.classList.remove('cur'); }); a[1].classList.add('cur'); } }); }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function (p) { nav.observe(p[0]); });
  }

  /* ---- 9. the trace player (Analysis), kept from v1 with hover readout ---- */
  function initTrace(root) {
    var D = window.ECHO_TRACE; if (!D) return;
    var mode = 'mixed', timer = null;
    var bar = h('div', 'tv-bar'), tabs = h('div', 'tv-tabs');
    var bM = btn('tv-tab', 'Mixed-Policy GRPO <small>privileged trace</small>', function () { setMode('mixed'); }), bE = btn('tv-tab', 'Echo-GRPO <small>idiolectal paraphrase</small>', function () { setMode('echo'); });
    tabs.append(bM, bE); var play = btn('tv-play', '<i class="fa-solid fa-play"></i> Play update', run); bar.append(tabs, play);
    var meter = h('div', 'tv-meter two'), mClip = h('div', 'tv-m', '<b>0</b><span>clipped tokens</span>'), mKey = h('div', 'tv-m', '<b>&ndash;</b><span>&ldquo;robot&rdquo; in the update</span>');
    meter.append(mClip, mKey);
    var box = h('div', 'tv-text'), tip = h('div', 'tv-tip'); tip.hidden = true;
    var legend = h('div', 'tv-legend', '<span><i class="g"></i>clipped: no gradient</span><span><i class="ramp"></i>loss per token (low &rarr; high)</span><span><u>robot</u> / <u>scraping</u>: key reasoning words</span>');
    var cap = h('p', 'tv-cap'); root.append(bar, meter, box, legend, cap, tip);
    var spans = [];
    function paint(sp) { var t = D[mode].tokens[+sp.dataset.i]; sp.style.background = lossColor(-t[1]); sp.classList.toggle('clip', clipped(D[mode], t)); sp.classList.add('on'); }
    function summary(n) {
      var T = D[mode].tokens, keys = T.filter(function (t) { return /robot/i.test(t[0]); }), kc = keys.filter(function (t) { return clipped(D[mode], t); }).length;
      mClip.querySelector('b').textContent = n; mClip.classList.toggle('bad', n > 0); mClip.classList.toggle('good', n === 0);
      mKey.querySelector('b').textContent = kc ? kc + ' of ' + keys.length + ' clipped' : 'all ' + keys.length + ' learned'; mKey.classList.toggle('bad', kc > 0); mKey.classList.toggle('good', kc === 0);
      cap.innerHTML = mode === 'mixed' ? 'The privileged trace reaches the correct answer, so it is <b>rewarded</b>. But its unfamiliar tokens push the importance ratio above 1+&epsilon; and get <b>clipped</b>, including &ldquo;robot&rdquo;, the reason behind the answer.' : 'The same reasoning in the model&rsquo;s own words: every token stays inside the trust region, so &ldquo;robot&rdquo; and &ldquo;scraping&rdquo; now <b>receive gradient</b>.';
    }
    function finish() { spans.forEach(paint); summary(spans.filter(function (s) { return s.classList.contains('clip'); }).length); play.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Replay'; }
    function run() {
      clearInterval(timer); spans = layTokens(box, D[mode]); var n = 0, i = 0; mClip.querySelector('b').textContent = '0';
      if (REDUCED) { finish(); return; }
      play.innerHTML = '<i class="fa-solid fa-pause"></i> Updating&hellip;';
      timer = setInterval(function () { for (var k = 0; k < 4 && i < spans.length; k++, i++) { var sp = spans[i]; paint(sp); if (sp.classList.contains('clip')) { n++; sp.classList.add('pop'); mClip.querySelector('b').textContent = n; mClip.classList.add('bad'); } } if (i >= spans.length) { clearInterval(timer); finish(); } }, 22);
    }
    function setMode(m) { mode = m; pressed([bM, bE], m === 'mixed' ? bM : bE); root.classList.toggle('is-echo', m === 'echo'); run(); }
    box.addEventListener('mousemove', function (e) {
      var sp = e.target.closest('.tk'); if (!sp || !sp.classList.contains('on')) { tip.hidden = true; return; }
      var t = D[mode].tokens[+sp.dataset.i], c = clipped(D[mode], t);
      tip.innerHTML = '<b>' + esc(t[0].trim() || '␣') + '</b><span>log p ' + t[1].toFixed(2) + '</span><span>ratio r&#770; ' + t[2].toFixed(2) + '</span><em class="' + (c ? 'bad' : 'good') + '">' + (c ? 'clipped: no gradient' : 'in trust region') + '</em>';
      var r = root.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY - r.top + 16) + 'px';
    });
    box.addEventListener('mouseleave', function () { tip.hidden = true; });
    pressed([bM, bE], bM); spans = layTokens(box, D[mode]); cap.textContent = 'Press play to watch one GRPO update on the privileged trace.';
    onVisible(root, run, 0.4);
  }

  function boot() {
    document.querySelectorAll('[data-viz="hero"]').forEach(initHero);
    document.querySelectorAll('[data-viz="pipeline"]').forEach(initPipeline);
    document.querySelectorAll('[data-viz="epsilon"]').forEach(initEpsilon);
    document.querySelectorAll('[data-viz="drd"]').forEach(initDRD);
    document.querySelectorAll('[data-viz="curves"]').forEach(initCurves);
    document.querySelectorAll('[data-viz="results"]').forEach(initResults);
    document.querySelectorAll('[data-viz="trace"]').forEach(initTrace);
    document.querySelectorAll('[data-viz="race"]').forEach(initRace);
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
