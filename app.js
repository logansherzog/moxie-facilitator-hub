/* Startup Moxie Facilitator Hub — shared rendering for all pages.
   Reads window.MOXIE (from content.js) + body[data-page]. No framework, no build step. */
(function () {
  var M = window.MOXIE;
  if (!M) { console.error("content.js not loaded"); return; }

  var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  // Lucide icon markup (rendered by lucide.createIcons() after each page render).
  var ic = function (name) { return '<i data-lucide="' + name + '"></i>'; };
  function drawIcons() { if (window.lucide && lucide.createIcons) lucide.createIcons(); }

  // Inline lightbulb watermark for the hero — the brand's visual anchor.
  var HERO_BULB = '<svg class="hero-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 18h6"/><path d="M10 22h4"/>' +
    '<path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>';

  // Current program week from an optional cohort start date (M.program.startDate, ISO).
  // Returns null when unset so everything degrades to "no current week."
  function currentWeek() {
    var start = M.program && M.program.startDate;
    if (!start) return null;
    var s = new Date(start + "T00:00:00");
    if (isNaN(s)) return null;
    var days = Math.floor((Date.now() - s.getTime()) / 86400000);
    var wk = Math.floor(days / 7) + 1;
    if (wk < 1) return null;
    return wk;
  }

  function videoMarkup(v) {
    if (!v) return "";
    if (typeof v === "string") {
      return '<a class="slide-vid" href="' + esc(v) + '" target="_blank" rel="noopener">' + ic('external-link') + ' Find a video</a>';
    }
    if (v.kind === "video") {
      var meta = [v.channel, v.length].filter(Boolean).map(esc).join(" · ");
      return '<a class="slide-vid watch" href="' + esc(v.url) + '" target="_blank" rel="noopener">' +
               ic('play') + ' Watch: <b>' + esc(v.title) + '</b>' + (meta ? ' <span class="vid-meta">' + meta + '</span>' : '') +
             '</a>' +
             (v.search ? '<a class="slide-vid alt" href="' + esc(v.search) + '" target="_blank" rel="noopener">' + ic('external-link') + ' other options</a>' : '');
    }
    return '<a class="slide-vid" href="' + esc(v.url) + '" target="_blank" rel="noopener">' + ic('external-link') + ' Find a video</a>';
  }

  function eachLesson(fn) {
    M.units.forEach(function (u, ui) {
      u.lessons.forEach(function (l) { fn(l, u, ui); });
    });
  }
  function findLesson(id) {
    var hit = null;
    eachLesson(function (l, u) { if (l.id === id) hit = { lesson: l, unit: u }; });
    return hit;
  }

  function buildPrompt(l) {
    var objs = (l.objectives || []).join("; ");
    var plan = (l.lessonPlan || []).map(function (b) { return b.block + " — " + b.detail; }).join("\n");
    var gq = l.guidingQuestion ? ("\n\nThe guiding question for the week is: " + l.guidingQuestion) : "";
    return 'I\'m about to facilitate the Startup Moxie week "' + l.title + '".' + gq +
      "\n\nThe objectives are: " + objs +
      "\n\nThe week runs:\n" + plan +
      "\n\nHelp me prep: walk me through how to open Monday, anticipate where students get stuck, and suggest 3 discussion questions.";
  }

  function setNav(page) {
    var o = document.getElementById("nav-overview"), s = document.getElementById("nav-structure");
    if (o) o.classList.toggle("active", page === "overview");
    if (s) s.classList.toggle("active", page === "structure");
  }

  function hasSlidesFor(l) { return !!(l.deck && l.deck.url) || !!(l.slides && (l.slides.embedUrl || l.slides.pdfUrl)); }
  function hasPodFor(l) { return !!(l.podcast && l.podcast.audioUrl); }
  function hasToolFor(l) { return !!(l.tool && l.tool.url); }

  /* ---------------- Overview ---------------- */
  function renderOverview(root) {
    var p = M.program;
    var nowWeek = currentWeek();
    var weekExists = nowWeek != null && M.units.some(function (u) {
      return u.lessons.some(function (l) { return l.week === nowWeek; });
    });

    var html = '' +
      '<section class="hero">' + HERO_BULB +
        '<div class="hero-inner">' +
          '<div class="hero-kicker"><span class="eyebrow">Scope &amp; Sequence</span><span class="spark-rule"></span></div>' +
          '<h1 class="hero-title">' + esc(p.title) + '</h1>' +
          '<p class="hero-tagline">' + esc(p.tagline) + '</p>' +
          '<p class="hero-intro">' + esc(p.intro) + '</p>' +
          '<div class="hero-actions">' +
            (weekExists ? '<button class="week-jump" id="week-jump">' + ic('calendar') + 'Jump to Week ' + pad(nowWeek) + '</button>' : '') +
            '<a class="hero-link" href="structure.html">Start here: how we facilitate <span>' + ic('arrow-right') + '</span></a>' +
          '</div>' +
        '</div>' +
      '</section>';

    // Toolbar — live search + capability filters
    html += '<div class="hub-toolbar">' +
      '<label class="search-wrap">' + ic('search') +
        '<input class="search-input" id="hub-search" type="search" placeholder="Search weeks by title or objective…" autocomplete="off">' +
      '</label>' +
      '<button class="chip-filter" data-filter="slides">' + ic('presentation') + 'Slides</button>' +
      '<button class="chip-filter" data-filter="pod">' + ic('headphones') + 'Podcast</button>' +
      '<button class="chip-filter" data-filter="tool">' + ic('wrench') + 'Tool</button>' +
      '<span class="result-count" id="result-count"></span>' +
    '</div>';

    M.units.forEach(function (u, ui) {
      var segs = u.lessons.map(function (l) {
        var cls = nowWeek == null ? "" : (l.week < nowWeek ? "done" : (l.week === nowWeek ? "now" : ""));
        return '<i class="' + cls + '"></i>';
      }).join('');
      html += '<section class="unit">' +
        '<div class="unit-head"><span class="eyebrow unit-eyebrow">Unit ' + pad(ui + 1) + '</span>' +
        '<h2 class="unit-title">' + esc(u.title) + '</h2>' +
        '<span class="unit-count">' + u.lessons.length + ' weeks</span></div>' +
        '<div class="unit-progress">' + segs + '</div>' +
        '<p class="unit-summary">' + esc(u.summary) + '</p>' +
        '<div class="lesson-list">';
      u.lessons.forEach(function (l) {
        var hasSlides = hasSlidesFor(l), hasPod = hasPodFor(l), hasTool = hasToolFor(l);
        var isNow = nowWeek != null && l.week === nowWeek;
        var search = (l.title + " " + (l.subtitle || "") + " " + (l.objectives || []).join(" ") + " " + (l.duration || "")).toLowerCase();
        html += '<a class="lesson-row' + (isNow ? ' is-now' : '') + '" href="lesson.html?id=' + encodeURIComponent(l.id) + '"' +
          ' data-search="' + esc(search) + '" data-slides="' + hasSlides + '" data-pod="' + hasPod + '" data-tool="' + hasTool + '"' +
          (l.week != null ? ' id="week-' + l.week + '"' : '') + '>' +
          '<span class="lesson-num">' + pad(l.week != null ? l.week : 0) + '</span>' +
          '<div><h3 class="lesson-title">' + esc(l.title) +
            (isNow ? '<span class="now-tag">This week</span>' : '') + '</h3>' +
            '<div class="lesson-meta">' +
              '<span class="meta-txt">' + ic('clock') + esc(l.duration) + '</span>' +
              '<span class="meta-txt">' + ic('target') + (l.objectives ? l.objectives.length : 0) + ' objectives</span>' +
              '<span class="pill ' + (hasSlides ? 'pill-slides-on' : 'pill-slides-off') + '">' + (hasSlides ? 'Slides' : 'No slides') + '</span>' +
              '<span class="pill ' + (hasPod ? 'pill-pod-on' : 'pill-pod-off') + '">' + (hasPod ? 'Podcast' : 'No podcast') + '</span>' +
            '</div></div>' +
          '<span class="lesson-arrow">' + ic('arrow-right') + '</span></a>';
      });
      html += '</div></section>';
    });
    root.innerHTML = html;

    wireOverview(nowWeek, weekExists);
    drawIcons();
  }

  // Search + filter + jump-to-week wiring for the Overview page.
  function wireOverview(nowWeek, weekExists) {
    var input = document.getElementById("hub-search");
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip-filter"));
    var rows = Array.prototype.slice.call(document.querySelectorAll(".lesson-row"));
    var units = Array.prototype.slice.call(document.querySelectorAll(".unit"));
    var count = document.getElementById("result-count");
    var active = {}; // capability filters that are on

    function apply() {
      var q = (input.value || "").trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        var ok = !q || r.getAttribute("data-search").indexOf(q) !== -1;
        Object.keys(active).forEach(function (k) {
          if (active[k] && r.getAttribute("data-" + k) !== "true") ok = false;
        });
        r.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      // Hide a unit whose rows are all filtered out
      units.forEach(function (u) {
        var any = Array.prototype.some.call(u.querySelectorAll(".lesson-row"), function (r) { return r.style.display !== "none"; });
        u.style.display = any ? "" : "none";
      });
      var filtering = q || Object.keys(active).some(function (k) { return active[k]; });
      count.innerHTML = filtering ? '<b>' + shown + '</b> of ' + rows.length + ' weeks' : '';
    }

    if (input) input.addEventListener("input", apply);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var k = c.getAttribute("data-filter");
        active[k] = !active[k];
        c.classList.toggle("on", active[k]);
        apply();
      });
    });

    var jump = document.getElementById("week-jump");
    if (jump && weekExists) {
      jump.addEventListener("click", function () {
        var el = document.getElementById("week-" + nowWeek);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  /* ---------------- Lesson ---------------- */
  function renderLesson(root) {
    var id = new URLSearchParams(location.search).get("id");
    var found = id && findLesson(id);
    if (!found) { location.replace("index.html"); return; }
    var l = found.lesson, u = found.unit;
    document.title = l.title + " · Startup Moxie";

    var deck = l.deck || {};
    var deckCard = deck.url
      ? '<a class="deck-card" href="' + esc(deck.url) + '" target="_blank" rel="noopener">' +
          '<div><span class="eyebrow">' + esc(deck.eyebrow || 'Monday deck') + '</span>' +
          '<div class="deck-title">' + esc(deck.title || l.title) + '</div>' +
          (deck.subtitle ? '<div class="deck-sub">' + esc(deck.subtitle) + '</div>' : '') + '</div>' +
          '<span class="deck-cta">Open the full deck in Google Slides ' + ic('arrow-up-right') + '</span></a>'
      : '<div class="deck-card placeholder"><div class="deck-title">Deck link coming soon</div>' +
          '<span class="eyebrow">Add a deck URL in build/decks.csv</span></div>';

    var tool = l.tool || {};
    var toolCard = tool.url
      ? '<a class="deck-card tool-card" href="' + esc(tool.url) + '" target="_blank" rel="noopener">' +
          '<div><span class="eyebrow">' + esc(tool.eyebrow || 'Hands-on tool') + '</span>' +
          '<div class="deck-title">' + esc(tool.title || l.title) + '</div>' +
          '<div class="deck-sub">Runs in Claude — a free account works</div></div>' +
          '<span class="deck-cta">Open the tool ' + ic('arrow-up-right') + '</span></a>'
      : '';

    var outline = (l.slideOutline || []).length
      ? '<section id="s-outline"><div class="eyebrow sec-eyebrow">Slide outline</div><div class="slide-list">' +
          l.slideOutline.map(function (s) {
            return '<div class="slide-item"><span class="slide-n">' + esc(s.n) + '</span>' +
              '<div><div class="slide-t">' + esc(s.title) + '</div>' +
              (s.onSlide ? '<p class="slide-on">' + esc(s.onSlide) + '</p>' : '') +
              (s.image ? '<p class="slide-img">' + ic('image') + 'Image: ' + esc(s.image) + '</p>' : '') +
              videoMarkup(s.video) +
              '</div></div>';
          }).join('') + '</div></section>'
      : '';

    var planBlocks = (l.lessonPlan || []).map(function (b) {
      return '<div class="tl-row"><div class="tl-mark"><span class="tl-dot"></span><span class="tl-line"></span></div>' +
        '<div class="tl-body"><div class="tl-block">' + esc(b.block) + '</div>' +
        '<div class="tl-detail">' + esc(b.detail) + '</div></div></div>';
    }).join('');

    var materials = (l.materials || []).length
      ? '<div style="margin-top:36px"><div class="eyebrow sec-eyebrow">Materials</div>' +
        '<ul class="mat-list">' + l.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>'
      : '';

    var fullPlan = l.weekPlanHtml
      ? '<section id="s-full"><details class="full-plan"><summary>Full weekly plan (Monday–Friday)<span class="chev">' + ic('chevron-right') + '</span></summary>' +
        '<div class="plan-html">' + l.weekPlanHtml + '</div></details></section>'
      : '';

    var pod = l.podcast || {};
    var podcast = pod.audioUrl
      ? '<div class="pod-card"><div class="pod-title">' + esc(pod.title) + '</div>' +
        (pod.notes ? '<div class="pod-notes">' + esc(pod.notes) + '</div>' : '') +
        '<audio controls src="' + esc(pod.audioUrl) + '" style="width:100%;margin-top:12px"></audio></div>'
      : '<div class="pod-card soon"><span class="pod-icon">' + ic('headphones') + '</span><div>' +
        '<div class="pod-title">' + esc(pod.title || 'Podcast') + '</div>' +
        '<div class="pod-notes">' + (pod.notes ? esc(pod.notes) + ' ' : '') + 'Audio coming soon.</div></div></div>';

    var art = l.article;
    var deepDive = art
      ? '<section id="s-deepdive"><div class="eyebrow sec-eyebrow">Subject deep-dive</div>' +
        '<a class="article-card" href="article.html?id=' + encodeURIComponent(l.id) + '">' +
          '<div class="article-card-main">' +
            '<span class="eyebrow">Read · ' + art.readingTime + ' min</span>' +
            '<div class="article-card-title">' + esc(l.title) + '</div>' +
            (art.dek ? '<p class="article-card-dek">' + esc(art.dek) + '</p>' : '') +
          '</div>' +
          '<span class="article-card-cta">Read the deep-dive ' + ic('arrow-right') + '</span>' +
        '</a></section>'
      : '';

    var resItems = [];
    if (l.planDocUrl) resItems.push({ label: 'Full weekly plan (Google Doc)', url: l.planDocUrl });
    if (l.outlineDocUrl) resItems.push({ label: 'Monday slide outline (Google Doc)', url: l.outlineDocUrl });
    if (deck.url) resItems.push({ label: 'Monday slide deck (Google Slides)', url: deck.url });
    var resources = resItems.length
      ? '<div style="margin-top:36px"><div class="eyebrow sec-eyebrow">Resources</div>' +
        '<div class="res-list">' + resItems.map(function (r) {
          return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener"><span class="ext">' + ic('external-link') + '</span>' + esc(r.label) + '</a>';
        }).join('') + '</div></div>'
      : '';

    root.innerHTML = '' +
      '<a class="back-link" href="index.html">' + ic('arrow-left') + ' All units</a>' +
      '<div class="lesson-grid">' +
        '<aside class="rail">' +
          '<span class="eyebrow rail-eyebrow">' + esc(u.title) + '</span>' +
          '<h1 class="rail-title">' + esc(l.title) + '</h1>' +
          (l.subtitle ? '<p class="rail-sub">' + esc(l.subtitle) + '</p>' : '') +
          '<div class="rail-pills">' +
            '<span class="pill pill-dur">' + esc(l.duration) + '</span>' +
            ((l.objectives && l.objectives.length) ? '<span class="pill pill-obj">' + l.objectives.length + ' objectives</span>' : '') +
          '</div>' +
          (l.weekMeta ? '<p class="rail-meta">' + esc(l.weekMeta) + '</p>' : '') +
          '<nav class="jump-nav">' +
            ((l.objectives && l.objectives.length) ? '<a href="#s-obj">Objectives</a>' : '') +
            (art ? '<a href="#s-deepdive">Deep-dive</a>' : '') +
            '<a href="#s-slides">Slides</a>' +
            (toolCard ? '<a href="#s-tool">Hands-on tool</a>' : '') +
            (outline ? '<a href="#s-outline">Slide outline</a>' : '') +
            '<a href="#s-plan">Weekly plan</a>' +
            (fullPlan ? '<a href="#s-full">Full plan</a>' : '') +
            '<a href="#s-pod">Podcast</a>' +
            '<a href="#s-notes">Notes &amp; resources</a>' +
            '<a class="accent" href="#s-prep">Prep with Claude</a>' +
          '</nav>' +
        '</aside>' +
        '<div class="content">' +
          (l.guidingQuestion ? '<section class="guiding"><span class="eyebrow">Guiding question</span><p>' + esc(l.guidingQuestion) + '</p></section>' : '') +
          deepDive +
          ((l.objectives && l.objectives.length) ?
            '<section id="s-obj"><div class="eyebrow sec-eyebrow">Objectives</div><ul class="obj-list">' +
            l.objectives.map(function (o) {
              return '<li><span class="obj-arrow">' + ic('arrow-right') + '</span><span class="obj-text">' + esc(o) + '</span></li>';
            }).join('') + '</ul></section>' : '') +
          '<section id="s-slides"><div class="eyebrow sec-eyebrow">Monday deck</div>' + deckCard + '</section>' +
          (toolCard ? '<section id="s-tool"><div class="eyebrow sec-eyebrow">Hands-on tool</div>' + toolCard + '</section>' : '') +
          outline +
          '<section id="s-plan"><div class="eyebrow sec-eyebrow">Weekly plan</div><div class="timeline">' + planBlocks + '</div>' + materials + '</section>' +
          fullPlan +
          '<section id="s-pod"><div class="eyebrow sec-eyebrow">Podcast</div>' + podcast + '</section>' +
          '<section id="s-notes"><div class="eyebrow sec-eyebrow">Facilitator notes</div>' +
            '<p style="font-family:var(--font-display);font-weight:500;font-size:20px;line-height:1.55;color:var(--text-heading);margin:0;max-width:62ch;border-left:3px solid var(--color-highlight);padding-left:22px">' +
            esc(l.facilitatorNotes || l.guidingQuestion || 'Keep the week anchored to its guiding question and end each day on a concrete next action.') + '</p>' +
            resources + '</section>' +
          '<section id="s-prep" class="prep">' +
            '<div class="eyebrow">Voice-mode prep</div>' +
            '<h2>Prep with Claude</h2>' +
            '<p>Copy this prompt built from the week, then paste it into Claude voice mode to rehearse.</p>' +
            '<div class="prep-box" id="prep-box">' + esc(buildPrompt(l)) + '</div>' +
            '<div class="prep-actions"><button class="prep-btn" id="prep-copy">' + ic('copy') + 'Copy prompt</button>' +
            '<span class="prep-copied" id="prep-copied" style="display:none">' + ic('check') + 'Copied</span></div>' +
          '</section>' +
        '</div>' +
      '</div>';

    var btn = document.getElementById("prep-copy");
    var flag = document.getElementById("prep-copied");
    var t;
    btn.addEventListener("click", function () {
      var text = buildPrompt(l);
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      flag.style.display = "";
      clearTimeout(t);
      t = setTimeout(function () { flag.style.display = "none"; }, 2200);
    });

    wireScrollSpy();
    drawIcons();
  }

  // Highlight the jump-nav link for the section currently in view.
  function wireScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".jump-nav a"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("active"); });
          if (byId[e.target.id]) byId[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-96px 0px -65% 0px", threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }

  /* ---------------- Facilitation Playbook ---------------- */
  function block_manifesto(b) {
    return '<section class="play-manifesto">' +
      '<span class="eyebrow" style="color:var(--color-accent)">' + esc(b.eyebrow || 'Start here') + '</span>' +
      '<h2 class="play-manifesto-h">' + esc(b.heading) + '</h2>' +
      '<p class="play-manifesto-body">' + esc(b.body) + '</p></section>';
  }
  function block_ratio(b) {
    var segs = (b.parts || []).map(function (p) {
      return '<div class="ratio-seg ratio-' + esc(p.label.toLowerCase()) + '" style="flex:' + (p.pct || 1) + '">' +
        '<span class="ratio-pct">' + esc(p.pct) + '%</span>' +
        '<span class="ratio-label">' + esc(p.label) + '</span>' +
        '<span class="ratio-note">' + esc(p.note || '') + '</span></div>';
    }).join('');
    return '<section class="play-sec"><div class="eyebrow sec-eyebrow">' + esc(b.heading) + '</div>' +
      (b.note ? '<p class="play-note">' + esc(b.note) + '</p>' : '') +
      '<div class="ratio-bar">' + segs + '</div></section>';
  }
  // Map a content emoji (or an explicit b.lucide) to a Lucide icon. The DS bans
  // emoji, so we render a Lucide glyph regardless — falling back to a sensible default.
  var STRAT_ICON = {
    '🎯': 'target', '💬': 'message-circle', '🔁': 'repeat', '🔍': 'search',
    '⚡': 'zap', '🛠️': 'wrench', '🧭': 'compass', '👂': 'ear', '🤝': 'handshake',
    '📣': 'megaphone', '🧪': 'flask-conical', '💡': 'lightbulb'
  };
  function stratIcon(s) {
    if (s.lucide) return s.lucide;
    if (s.icon && STRAT_ICON[s.icon.trim()]) return STRAT_ICON[s.icon.trim()];
    return 'lightbulb';
  }
  function block_strategies(b) {
    var cards = (b.items || []).map(function (s) {
      return '<div class="strategy-card">' +
        '<div class="strategy-head"><span class="strategy-num">' + pad(s.num) + '</span>' +
        '<span class="strategy-icon">' + ic(stratIcon(s)) + '</span>' +
        '<div><h3 class="strategy-title">' + esc(s.title) + '</h3>' +
        '<p class="strategy-tagline">' + esc(s.tagline || '') + '</p></div></div>' +
        '<p class="strategy-body">' + esc(s.body) + '</p>' +
        (s.tip ? '<div class="callout callout-tip"><span class="callout-k">Tip</span>' + esc(s.tip) + '</div>' : '') +
        (s.example ? '<div class="callout callout-example"><span class="callout-k">In practice</span>' + esc(s.example) + '</div>' : '') +
        '</div>';
    }).join('');
    return '<section class="play-sec"><div class="eyebrow sec-eyebrow">' + esc(b.heading) + '</div>' +
      '<div class="strategy-grid">' + cards + '</div></section>';
  }
  function block_questions(b) {
    var cards = (b.groups || []).map(function (g) {
      return '<div class="qbank-card"><div class="qbank-kind">' + esc(g.kind) + '</div>' +
        '<div class="qbank-ex">' + esc(g.example) + '</div></div>';
    }).join('');
    return '<section class="play-sec"><div class="eyebrow sec-eyebrow">' + esc(b.heading) + '</div>' +
      (b.note ? '<p class="play-note">' + esc(b.note) + '</p>' : '') +
      '<div class="qbank-grid">' + cards + '</div></section>';
  }
  function block_mindset(b) {
    var rows = (b.items || []).map(function (m) {
      return '<li><span class="mindset-check">' + ic('check') + '</span>' + esc(m) + '</li>';
    }).join('');
    return '<section class="play-sec"><div class="eyebrow sec-eyebrow">' + esc(b.heading) + '</div>' +
      '<ul class="mindset-list">' + rows + '</ul></section>';
  }
  function block_rhythm(b) {
    var rows = (b.days || []).map(function (d) {
      return '<div class="tl-row"><div class="tl-mark"><span class="tl-dot"></span><span class="tl-line"></span></div>' +
        '<div class="tl-body"><div class="tl-block">' + esc(d.day) + '</div>' +
        '<div class="tl-detail">' + esc(d.note) + '</div></div></div>';
    }).join('');
    return '<section class="play-sec"><div class="eyebrow sec-eyebrow">' + esc(b.heading) + '</div>' +
      '<div class="timeline">' + rows + '</div></section>';
  }
  var BLOCKS = {
    manifesto: block_manifesto, ratio: block_ratio, strategies: block_strategies,
    questions: block_questions, mindset: block_mindset, rhythm: block_rhythm,
  };

  function renderStructure(root) {
    var d = M.structureDoc || {};
    var body = (d.blocks || []).map(function (b) {
      var fn = BLOCKS[b.type];
      return fn ? fn(b) : '';
    }).join('');

    var sources = (d.sources || []).length
      ? '<section class="play-sec"><div class="eyebrow sec-eyebrow">Go deeper — source docs</div>' +
        '<div class="res-list">' + d.sources.map(function (s) {
          return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="ext">' + ic('external-link') + '</span>' + esc(s.label) + '</a>';
        }).join('') + '</div></section>'
      : '';

    root.innerHTML = '' +
      '<div class="doc-kicker"><span class="eyebrow" style="color:var(--color-accent)">Read this first</span>' +
      '<span class="spark-rule" style="max-width:180px"></span></div>' +
      '<h1 class="doc-title">' + esc(d.title || 'How We Facilitate') + '</h1>' +
      (d.lede ? '<p class="doc-lede">' + esc(d.lede) + '</p>' : '') +
      '<div class="play-blocks">' + body + sources + '</div>';
    drawIcons();
  }

  /* ---------------- Article (subject deep-dive) ---------------- */
  function renderArticle(root) {
    var id = new URLSearchParams(location.search).get("id");
    var found = id && findLesson(id);
    if (!found || !found.lesson.article) {
      location.replace(found ? "lesson.html?id=" + encodeURIComponent(id) : "index.html");
      return;
    }
    var l = found.lesson, u = found.unit, a = l.article;
    document.title = l.title + " · Deep-dive · Startup Moxie";
    root.innerHTML = '' +
      '<a class="back-link" href="lesson.html?id=' + encodeURIComponent(l.id) + '">' + ic('arrow-left') + ' Back to Week ' + l.week + '</a>' +
      '<article class="article">' +
        '<header class="article-head">' +
          '<span class="eyebrow" style="color:var(--color-support)">' + esc(u.title) + ' · Week ' + l.week + '</span>' +
          '<h1 class="article-title">' + esc(l.title) + '</h1>' +
          (l.subtitle ? '<p class="article-sub">' + esc(l.subtitle) + '</p>' : '') +
          (a.dek ? '<p class="article-dek">' + esc(a.dek) + '</p>' : '') +
          '<div class="article-meta"><span class="pill pill-dur">' + a.readingTime + ' min read</span>' +
            '<span class="article-listen">' + ic('headphones') +
              ((l.podcast && l.podcast.audioUrl) ? ' Listen to this deep-dive' : ' Audio version coming soon') +
            '</span></div>' +
          ((l.podcast && l.podcast.audioUrl)
            ? '<audio controls src="' + esc(l.podcast.audioUrl) + '" style="width:100%;margin-top:14px"></audio>'
            : '') +
        '</header>' +
        '<div class="article-body">' + a.html + '</div>' +
        '<footer class="article-foot"><a class="hero-link" href="lesson.html?id=' + encodeURIComponent(l.id) + '">Back to the week <span>' + ic('arrow-right') + '</span></a></footer>' +
      '</article>';
    drawIcons();
  }

  /* ---------------- Boot ---------------- */
  var page = document.body.getAttribute("data-page");
  var root = document.getElementById("app");
  setNav(page);
  if (page === "overview") renderOverview(root);
  else if (page === "lesson") renderLesson(root);
  else if (page === "structure") renderStructure(root);
  else if (page === "article") renderArticle(root);
})();
