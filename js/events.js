// Renders /data/events.json (refreshed automatically by a GitHub Action):
// a month calendar with clickable event icons, then the day-by-day list.
(function () {
  var list = document.getElementById("ev-list");
  var credit = document.getElementById("ev-credit");
  var freeOnly = document.getElementById("free-only");
  var search = document.getElementById("ev-search");
  var countEl = document.getElementById("ev-count");
  var buttons = document.querySelectorAll(".ev-filters [data-filter]");
  var calGrid = document.getElementById("cal-grid");
  var calTitle = document.getElementById("cal-title");
  var calPrev = document.getElementById("cal-prev");
  var calNext = document.getElementById("cal-next");
  var calSel = document.getElementById("cal-sel");
  var calHint = document.getElementById("cal-hint");
  var MONTHS_SHOWN = 3;   // this month plus the next two
  var HINT = "Tap a date to see that day, or an icon to jump straight to an event.";
  var narrow = window.matchMedia("(max-width: 640px)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var data = null;
  var filter = "all";
  var words = [];          // search words, normalised
  var selectedDay = null;   // "YYYY-MM-DD" or null for all dates
  var focusId = null;       // event id to highlight after an icon click
  var calYear = null, calMonth = null;

  var GROUPS = {
    arts: ["Art", "Music", "Performing Arts", "Arts & Culture", "Live Music", "History", "Public Art", "Movies", "Tours"],
    festivals: ["Street Festival", "Single Block Festival", "Parade", "Block Party", "Plaza Event", "Plaza Partner Event", "Open Street Partner Event", "Community Engagement", "Holiday"],
    markets: ["Food", "Farmers Market", "Smorgasburg"],
    nature: ["Nature Programs", "Birdwatching", "Environment", "Audubon Center", "Volunteer", "Fitness", "Wellness", "Running + Walking"],
    family: ["Kids", "Zoo", "Carousel"]
  };
  // Which icon an event gets when its tags fit several groups.
  var ICON_ORDER = ["markets", "festivals", "family", "nature", "arts"];
  var CAT_NAMES = { arts: "Arts & music", festivals: "Festival or parade", markets: "Market or food", nature: "Nature & outdoors", family: "Family", civic: "Civic", other: "Event" };
  var ICONS = {
    arts: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
    festivals: '<path d="M5 21V4"/><path d="M5 4h12l-3 4 3 4H5"/>',
    markets: '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6"/><path d="M9.5 13v4M14.5 13v4"/>',
    nature: '<path d="M5 19C5 11 10 6 20 5c-1 10-6 15-14 15"/><path d="M5 19l8-8"/>',
    family: '<path d="M12 3c2.8 0 5 2.6 5 6 0 3.5-2.5 6-5 6s-5-2.5-5-6c0-3.4 2.2-6 5-6z"/><path d="M11 17h2l-1-2z"/><path d="M12 17c0 2-1.5 2.5-.5 4"/>',
    civic: '<path d="M3 21h18"/><path d="M4 10h16"/><path d="M12 3l8.5 5h-17z"/><path d="M6.5 10v8M10.5 10v8M13.5 10v8M17.5 10v8"/>',
    other: '<path d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/>'
  };
  function svg(cat) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[cat] || ICONS.other) + "</svg>";
  }

  // ── dates: event times are New York local strings like "2026-10-03T10:00:00".
  // Treat them as UTC internally so formatting never shifts them.
  function parts(s) {
    var m = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))), hasTime: !!m[4], day: m[1] + "-" + m[2] + "-" + m[3] };
  }
  function fmt(d, opts) { return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, opts)).format(d); }
  function time(p) { return fmt(p.date, { hour: "numeric", minute: "2-digit" }).replace(":00", ""); }
  function nowNY() {
    var s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    return s.replace(", ", "T");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayAdd(day, n) { var d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function longDay(day) { return fmt(parts(day).date, { weekday: "long", month: "long", day: "numeric" }); }

  // Every day (from today to `last`) that an event is on.
  function spanDays(e, today, last) {
    var s = e.start.slice(0, 10);
    var en = (e.end || e.start).slice(0, 10);
    if (e.allDay && e.end && e.end.length === 10 && en > s) en = dayAdd(en, -1); // iCal all-day end is exclusive
    if (en < s) en = s;
    var days = [];
    for (var d = s < today ? today : s; d <= en && d <= last && days.length < 130; d = dayAdd(d, 1)) days.push(d);
    return days;
  }

  // Feed data comes from outside sites: only ever use plain web links.
  function webUrl(u) {
    if (!u || typeof u !== "string") return null;
    try { var x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : null; }
    catch (err) { return null; }
  }

  function category(e) {
    return filter !== "all" && ICONS[filter] ? filter : baseCategory(e);   // icons follow the active filter
  }
  function baseCategory(e) {
    if (e.source === "bp") return "civic";
    for (var i = 0; i < ICON_ORDER.length; i++) {
      var g = GROUPS[ICON_ORDER[i]];
      if (e.tags.some(function (t) { return g.indexOf(t) > -1; })) return ICON_ORDER[i];
    }
    return "other";
  }

  // Lower-case and strip accents so "cafe" finds "Café".
  function norm(s) { return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function searchText(e) {
    if (e._q == null) {
      var src = (data.sources[e.source] || {}).name || "";
      e._q = norm([e.title, e.summary, e.location, e.tags.join(" "), src, CAT_NAMES[baseCategory(e)]].join(" "));
    }
    return e._q;
  }

  function matches(e) {
    if (words.length) {
      var hay = searchText(e);
      for (var w = 0; w < words.length; w++) if (hay.indexOf(words[w]) < 0) return false;
    }
    if (freeOnly.checked && e.tags.indexOf("Free") < 0) return false;
    if (filter === "all") return true;
    if (filter === "civic") return e.source === "bp";
    var g = GROUPS[filter] || [];
    return e.tags.some(function (t) { return g.indexOf(t) > -1; });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function whenText(e) {
    var s = parts(e.start), en = parts(e.end);
    if (e.timesArePermitWindow) return "Permitted " + (e.tags[0] || "event").toLowerCase();
    if (s.hasTime) return time(s) + (en && en.hasTime && en.day === s.day ? "–" + time(en) : "");
    return "All day";
  }

  // ── list ──────────────────────────────────────────────────────────────────
  function card(e) {
    var a = el("a", "ev-card");
    a.href = webUrl(e.url) || webUrl((data.sources[e.source] || {}).home) || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("data-ev-id", e.id);
    if (e.id === focusId) a.classList.add("is-flash");

    var imgUrl = webUrl(e.image);
    if (imgUrl) {
      var img = el("img", "ev-thumb");
      img.src = imgUrl;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () { img.remove(); };
      a.appendChild(img);
    }

    var body = el("div", "ev-body");
    var meta = el("div", "ev-meta");
    var cat = category(e);
    var icon = el("span", "fi cat-" + cat);
    icon.innerHTML = svg(cat);
    meta.appendChild(icon);
    meta.appendChild(document.createTextNode([whenText(e)].concat(e.location ? [e.location] : []).join(" · ")));
    body.appendChild(meta);
    body.appendChild(el("h3", null, e.title));
    if (e.summary) body.appendChild(el("p", "ev-summary", e.summary));

    var foot = el("div", "ev-foot");
    if (e.tags.indexOf("Free") > -1) foot.appendChild(el("span", "ev-free-tag", "Free"));
    var src = (data.sources[e.source] || {}).name || "Source";
    foot.appendChild(el("span", "ev-source", "via " + src + " →"));
    body.appendChild(foot);

    a.appendChild(body);
    return a;
  }

  function dayHeading(day, today) {
    var d = parts(day).date;
    var h = el("h2", "ev-day");
    h.textContent = day === today ? "Today" : fmt(d, { weekday: "long" });
    h.appendChild(el("span", null, fmt(d, { month: "long", day: "numeric" })));
    return h;
  }

  function monthKey() { return calYear + "-" + pad(calMonth + 1); }
  function monthName(y, m) { return fmt(new Date(Date.UTC(y, m, 1)), { month: "long" }); }
  function countText(n) { return n + (n === 1 ? " event" : " events"); }

  // A line of text with a bold lead and an optional link-style button.
  function fillLine(node, lead, rest, btnText, onClick) {
    node.innerHTML = "";
    node.appendChild(el("strong", null, lead));
    if (rest) node.appendChild(document.createTextNode(" · " + rest));
    if (btnText) {
      node.appendChild(document.createTextNode(" "));
      var b = el("button", "ev-linkbtn", btnText);
      b.type = "button";
      b.addEventListener("click", onClick);
      node.appendChild(b);
    }
  }

  function goToday() {
    var t = nowNY();
    calYear = +t.slice(0, 4); calMonth = +t.slice(5, 7) - 1;
    selectedDay = null; focusId = null;
    render();
  }

  // Groups to list: the selected day, or every upcoming day of the shown month.
  function listGroups(byDay, today) {
    if (selectedDay) return [[selectedDay, byDay[selectedDay] || []]];
    var groups = [], seen = {}, mk = monthKey();
    var dim = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    for (var d = 1; d <= dim; d++) {
      var day = mk + "-" + pad(d);
      if (day < today) continue;
      var evs = (byDay[day] || []).filter(function (e) { return !seen[e.id]; });
      evs.forEach(function (e) { seen[e.id] = 1; });
      if (evs.length) groups.push([day, evs]);
    }
    return groups;
  }

  function renderList(byDay, today) {
    var mk = monthKey(), mName = monthName(calYear, calMonth);
    var curMonth = today.slice(0, 7);
    var thisMonthName = monthName(+today.slice(0, 4), +today.slice(5, 7) - 1);
    var groups = listGroups(byDay, today);
    var total = groups.reduce(function (n, g) { return n + g[1].length; }, 0);
    var showMonth = function () { selectDay(null); };

    // Bar above the list, and the line under the calendar
    if (selectedDay) {
      fillLine(calSel, longDay(selectedDay), total ? countText(total) : null, "Show all of " + mName, showMonth);
      fillLine(calHint, "Showing " + longDay(selectedDay) + ".", null, "Show all of " + mName, showMonth);
    } else if (mk < curMonth) {
      fillLine(calSel, mName + " has passed", "only upcoming events are listed", "Back to " + thisMonthName, goToday);
      calHint.textContent = HINT;
    } else {
      fillLine(calSel, (mk === curMonth ? "Coming up in " : "All of ") + mName, total ? countText(total) : null);
      calHint.textContent = HINT;
    }

    countEl.hidden = !words.length;
    if (words.length) {
      countEl.textContent = (total ? countText(total) + (total === 1 ? " matches " : " match ") : "No events match ") +
        "“" + search.value.trim() + "” " + (selectedDay ? "on " + longDay(selectedDay) : "in " + mName) + ".";
    }

    list.innerHTML = "";
    if (!total) {
      var msg;
      if (words.length) msg = "No events match “" + search.value.trim() + "” " + (selectedDay ? "on that day" : "in " + mName) + ". Try a different word, or clear the search.";
      else if (mk < curMonth) msg = "Past events aren’t kept on this page.";
      else if (selectedDay) msg = "Nothing listed on " + longDay(selectedDay) + (filter !== "all" || freeOnly.checked ? " for this filter" : "") + ". Pick another day, or show the whole month.";
      else if (filter !== "all" || freeOnly.checked) msg = "Nothing in " + mName + " matches that filter — try another.";
      else msg = "Nothing listed for " + mName + " yet. More listings appear as the date gets closer, so check back soon.";
      list.appendChild(el("p", "ev-status", msg));
      return;
    }
    groups.forEach(function (g) {
      list.appendChild(dayHeading(g[0], today));
      var box = el("div", "ev-group");
      g[1].forEach(function (e) { box.appendChild(card(e)); });
      list.appendChild(box);
    });
  }

  // ── calendar ──────────────────────────────────────────────────────────────
  function renderCal(byDay, today) {
    var first = new Date(Date.UTC(calYear, calMonth, 1));
    var month = monthKey();
    var idx = calYear * 12 + calMonth;
    var todayIdx = +today.slice(0, 4) * 12 + (+today.slice(5, 7) - 1);
    calTitle.textContent = fmt(first, { month: "long", year: "numeric" });
    calPrev.disabled = idx <= todayIdx;                       // never before this month
    calNext.disabled = idx >= todayIdx + MONTHS_SHOWN - 1;    // this month + the next two
    calPrev.setAttribute("aria-label", "Previous month, " + fmt(new Date(Date.UTC(calYear, calMonth - 1, 1)), { month: "long", year: "numeric" }));
    calNext.setAttribute("aria-label", "Next month, " + fmt(new Date(Date.UTC(calYear, calMonth + 1, 1)), { month: "long", year: "numeric" }));

    calGrid.innerHTML = "";
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (w) {
      var h = el("div", "cal-wd", narrow.matches ? w.charAt(0) : w);
      h.setAttribute("aria-hidden", "true");
      calGrid.appendChild(h);
    });
    for (var i = 0; i < first.getUTCDay(); i++) calGrid.appendChild(el("div", "cal-cell is-empty"));

    var daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    var cap = narrow.matches ? 3 : 7;
    for (var d = 1; d <= daysInMonth; d++) {
      (function (day, n) {
        var upcoming = day >= today;
        var evs = upcoming ? (byDay[day] || []) : [];
        var cell = el("div", "cal-cell");
        if (!upcoming) cell.classList.add("is-out");
        else cell.classList.add("is-pick");
        if (day === today) cell.classList.add("is-today");
        if (day === selectedDay) cell.classList.add("is-selected");
        var toggle = function () { selectDay(day === selectedDay ? null : day); };

        var num = el("button", "cal-num", String(n));
        num.type = "button";
        num.setAttribute("aria-label", longDay(day) + ", " + (evs.length ? countText(evs.length) : upcoming ? "nothing listed" : "past"));
        num.setAttribute("aria-pressed", day === selectedDay ? "true" : "false");
        if (!upcoming) num.disabled = true;
        num.addEventListener("click", toggle);
        cell.appendChild(num);

        if (upcoming) {
          // Clicking anywhere in the square (other than an icon) picks the day.
          cell.addEventListener("click", function (ev) {
            if (ev.target.closest(".cal-ev, .cal-more, .cal-num")) return;
            toggle();
          });
        }

        if (evs.length) {
          var icons = el("div", "cal-icons");
          evs.slice(0, evs.length > cap ? cap - 1 : cap).forEach(function (e) {
            var cat = category(e);
            var b = el("button", "cal-ev cat-" + cat);
            b.type = "button";
            b.title = e.title + " — " + whenText(e);
            b.setAttribute("aria-label", CAT_NAMES[cat] + ": " + e.title + ", " + whenText(e) + ", " + longDay(day));
            b.innerHTML = svg(cat);
            b.addEventListener("click", function () { selectDay(day, e.id); });
            icons.appendChild(b);
          });
          if (evs.length > cap) {
            var more = el("button", "cal-more", "+" + (evs.length - cap + 1));
            more.type = "button";
            more.setAttribute("aria-label", "Show all " + evs.length + " events on " + longDay(day));
            more.addEventListener("click", function () { selectDay(day); });
            icons.appendChild(more);
          }
          cell.appendChild(icons);
        }
        calGrid.appendChild(cell);
      })(month + "-" + pad(d), d);
    }
  }

  function render() {
    if (!data) return;
    var now = nowNY();
    var today = now.slice(0, 10);
    // Keep the calendar inside the rolling window (also covers a page left open past month end).
    var tY = +today.slice(0, 4), tM = +today.slice(5, 7) - 1, tIdx = tY * 12 + tM;
    var idx = calYear === null ? -1 : calYear * 12 + calMonth;
    if (idx < tIdx || idx > tIdx + MONTHS_SHOWN - 1) { calYear = tY; calMonth = tM; selectedDay = null; }
    var last = dayAdd(new Date(Date.UTC(tY, tM + MONTHS_SHOWN, 1)).toISOString().slice(0, 10), -1);
    var base = data.events.filter(function (e) {
      return (e.end || e.start) >= (e.end && e.end.length > 10 ? now : today) && matches(e);
    });
    var byDay = {};
    base.forEach(function (e) {
      spanDays(e, today, last).forEach(function (d) { (byDay[d] = byDay[d] || []).push(e); });
    });
    renderCal(byDay, today);
    renderList(byDay, today);
  }

  function selectDay(day, evId) {
    selectedDay = day;
    focusId = evId || null;
    render();
    var behavior = reduceMotion.matches ? "auto" : "smooth";
    if (evId) {
      var cards = list.querySelectorAll(".ev-card");
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute("data-ev-id") === evId) {
          cards[i].scrollIntoView({ behavior: behavior, block: "center" });
          cards[i].focus({ preventScroll: true });
          break;
        }
      }
    } else if (day) {
      calSel.scrollIntoView({ behavior: behavior, block: "start" });
    }
  }

  function moveMonth(step) {
    calMonth += step;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    if (calMonth > 11) { calMonth = 0; calYear++; }
    selectedDay = null; focusId = null;
    render();
  }

  // ── controls ──────────────────────────────────────────────────────────────
  buttons.forEach(function (b) {
    var f = b.getAttribute("data-filter");
    if (ICONS[f]) {
      var i = el("span", "fi cat-" + f);
      i.innerHTML = svg(f);
      b.insertBefore(i, b.firstChild);
    }
    b.addEventListener("click", function () {
      buttons.forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      filter = f;
      render();
    });
  });
  freeOnly.addEventListener("change", render);
  var searchTimer = null;
  search.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      words = norm(search.value).split(/\s+/).filter(Boolean);
      render();
    }, 150);
  });
  search.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && search.value) { search.value = ""; words = []; render(); }
  });
  calPrev.addEventListener("click", function () { moveMonth(-1); });
  calNext.addEventListener("click", function () { moveMonth(1); });
  if (narrow.addEventListener) narrow.addEventListener("change", render);

  fetch("/data/events.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (json) {
      data = json;
      render();
      var names = Object.keys(data.sources).map(function (k) {
        return '<a href="' + data.sources[k].home + '" target="_blank" rel="noopener">' + data.sources[k].name + "</a>";
      });
      var updated = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(data.updated));
      credit.innerHTML = "Listings gathered automatically from " + names.join(", ") + ". Last updated " + updated + ". Times and details can change — always check the organizer's page before you go.";
    })
    .catch(function () {
      list.innerHTML = "";
      list.appendChild(el("p", "ev-status", "Events couldn't be loaded right now. Please try again shortly."));
      calGrid.innerHTML = "";
    });
})();
