/* Kosti.nails motion engine: reveals, words, curtains, stacks, lane, panel, menu, map */
(function () {
  var d = document, H = d.documentElement, W = window;
  var on = H.classList.contains('m-on');
  H.classList.add('m-ready');
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* fixed strip + header height -> --top-h */
  var top = d.querySelector('.topbar');
  var topH = function () { return top ? top.offsetHeight : 0; };
  if (top) {
    var setTop = function () { H.style.setProperty('--top-h', topH() + 'px'); };
    if ('ResizeObserver' in W) new ResizeObserver(setTop).observe(top);
    setTop();
  }

  /* mobile menu (details/summary): close on item click and Escape */
  var menu = d.querySelector('.mmenu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }

  /* click-to-load map */
  d.querySelectorAll('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map');
      var f = d.createElement('iframe');
      f.src = b.getAttribute('data-map');
      f.title = b.getAttribute('data-title') || 'Карта';
      f.loading = 'lazy';
      f.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(f);
      box.classList.add('map-on');
    });
  });

  if (!on) return;

  /* word split for [data-rv="words"] */
  d.querySelectorAll('[data-rv="words"]').forEach(function (el) {
    var i = 0;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), fr = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { fr.appendChild(d.createTextNode(p)); return; }
            var w = d.createElement('span'), wi = d.createElement('span');
            w.className = 'w'; wi.className = 'wi';
            wi.style.setProperty('--wi', i++);
            wi.textContent = p; w.appendChild(wi); fr.appendChild(w);
          });
          c.parentNode.replaceChild(fr, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  });

  /* stagger index for groups */
  d.querySelectorAll('[data-rv="group"]').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });

  /* glow paragraph: split into words */
  var glows = [];
  d.querySelectorAll('[data-glow]').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    var spans = words.map(function (w, i) {
      var s = d.createElement('span'); s.className = 'gw'; s.textContent = w;
      p.appendChild(s); if (i < words.length - 1) p.appendChild(d.createTextNode(' '));
      return s;
    });
    glows.push({ el: p, w: spans, n: -1 });
  });

  /* reveal */
  var rv = Array.prototype.slice.call(d.querySelectorAll('[data-rv]'));
  var show = function (el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.getAttribute('data-rv') === 'curtain') {
      var done = function (e) {
        if (e && e.target !== el) return;
        el.classList.add('done'); el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
      setTimeout(function () { el.classList.add('done'); }, 1800);
    }
  };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  rv.forEach(function (el) { io.observe(el); });

  /* tones */
  var tones = Array.prototype.slice.call(d.querySelectorAll('[data-tone]'));
  var tio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('tin'); });
  }, { rootMargin: '0px 0px -35% 0px' });
  tones.forEach(function (t) { tio.observe(t); });

  var sweep = function () {
    var vh = W.innerHeight, vw = W.innerWidth;
    rv.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.left < vw) show(el);
    });
    tones.forEach(function (t) { if (t.getBoundingClientRect().top < vh * 0.8) t.classList.add('tin'); });
  };

  /* lanes: [data-lane] > .lane-pin > .lane-view > .lane-track (+ .lane-prog) */
  var lanes = Array.prototype.slice.call(d.querySelectorAll('[data-lane]')).map(function (s) {
    return { s: s, track: s.querySelector('.lane-track'), view: s.querySelector('.lane-view'),
      prog: s.querySelector('.lane-prog i'), dist: 0, on: false };
  });
  var wide = W.matchMedia('(min-width: 900px)');
  var layoutLanes = function () {
    lanes.forEach(function (l) {
      if (wide.matches) {
        l.s.classList.add('lane');
        l.track.style.translate = '0 0';
        l.dist = Math.max(0, l.track.scrollWidth - l.view.clientWidth);
        var maxd = parseFloat(l.s.getAttribute('data-lane-max') || '0');
        if (maxd) {
          var cap = maxd * W.innerHeight;
          if (l.dist > cap) l.dist = cap;
        }
        l.s.style.height = (W.innerHeight - topH() + l.dist) + 'px';
        l.on = true;
      } else {
        l.s.classList.remove('lane'); l.s.style.height = ''; l.track.style.translate = ''; l.on = false;
      }
    });
  };
  var moveLanes = function () {
    lanes.forEach(function (l) {
      if (!l.on) return;
      var p = l.dist ? clamp((topH() - l.s.getBoundingClientRect().top) / l.dist, 0, 1) : 0;
      l.track.style.translate = (-p * l.dist).toFixed(1) + 'px 0';
      if (l.prog) l.prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });
  };

  /* final booking panel: --fx 48px -> 0 until its top reaches 40% */
  var panels = Array.prototype.slice.call(d.querySelectorAll('[data-panel]'));
  var movePanels = function () {
    var vh = W.innerHeight;
    panels.forEach(function (p) {
      var t = p.getBoundingClientRect().top;
      var k = clamp((t - vh * 0.4) / (vh * 0.6), 0, 1);
      p.style.setProperty('--fx', (k * 48).toFixed(1) + 'px');
    });
  };

  /* glow: words light up with scroll, both ways */
  var moveGlow = function () {
    var vh = W.innerHeight;
    glows.forEach(function (g) {
      var r = g.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1);
      var n = Math.round(p * g.w.length);
      if (n === g.n) return;
      g.n = n;
      g.w.forEach(function (s, i) { s.classList.toggle('lit', i < n); });
    });
  };

  /* drift (fallback without view() timelines) is CSS-only; nothing here */

  var ticking = false;
  var frame = function () { ticking = false; sweep(); moveLanes(); movePanels(); moveGlow(); };
  var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('hashchange', function () { setTimeout(req, 50); });
  W.addEventListener('beforeprint', function () { rv.forEach(show); });
  var lastW = W.innerWidth, lastH = W.innerHeight;
  W.addEventListener('resize', function () {
    var coarse = W.matchMedia('(pointer: coarse)').matches;
    if (coarse && W.innerWidth === lastW && Math.abs(W.innerHeight - lastH) < 160) return;
    lastW = W.innerWidth; lastH = W.innerHeight;
    layoutLanes(); req();
  });
  W.addEventListener('load', function () { layoutLanes(); req(); });
  layoutLanes();
  H.classList.add('glow-on');
  frame();

  /* fine pointer: tilt + light spot */
  if (W.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var tilts = d.querySelectorAll('[data-tilt]');
    var spot = d.querySelector('.spot');
    var mx = 0, my = 0, raf = 0;
    var paint = function () {
      raf = 0;
      if (spot) spot.style.transform = 'translate(' + (mx - 200) + 'px,' + (my - 200) + 'px)';
      tilts.forEach(function (t) {
        var r = t.getBoundingClientRect();
        var dx = clamp((mx - (r.left + r.width / 2)) / W.innerWidth, -0.5, 0.5);
        t.style.setProperty('--tilt', (dx * 6).toFixed(2) + 'deg');
      });
    };
    W.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (spot) spot.classList.add('lit');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
  }

  /* captions that assemble from marks: [data-marks] (real text stays in DOM) */
  var marks = d.querySelectorAll('[data-marks]');
  if (marks.length) {
    var glyphs = '+×/\\|-=:.#';
    var mio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        mio.unobserve(e.target);
        var el = e.target, real = el.querySelector('.mk-r'), tw = el.querySelector('.mk-n');
        if (!real || !tw) return;
        var txt = real.textContent, t0 = performance.now(), dur = 900;
        el.classList.add('scr');
        (function step(now) {
          var k = clamp((now - t0) / dur, 0, 1), out = '';
          for (var i = 0; i < txt.length; i++) {
            out += (txt[i] === ' ' || i / txt.length < k) ? txt[i] : glyphs[(Math.random() * glyphs.length) | 0];
          }
          tw.textContent = out;
          if (k < 1) requestAnimationFrame(step); else el.classList.remove('scr');
        })(t0);
      });
    });
    marks.forEach(function (m) { mio.observe(m); });
  }
})();
