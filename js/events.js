// Renders /data/events.json (refreshed automatically by a GitHub Action).
(function () {
  var list = document.getElementById("ev-list");
  var credit = document.getElementById("ev-credit");
  var freeOnly = document.getElementById("free-only");
  var buttons = document.querySelectorAll(".ev-filters [data-filter]");
  var data = null;
  var filter = "all";

  var GROUPS = {
    arts: ["Art", "Music", "Performing Arts", "Arts & Culture", "Live Music", "History", "Public Art", "Movies", "Tours"],
    festivals: ["Street Festival", "Single Block Festival", "Parade", "Block Party", "Plaza Event", "Plaza Partner Event", "Open Street Partner Event", "Community Engagement", "Holiday"],
    markets: ["Food", "Farmers Market", "Smorgasburg"],
    nature: ["Nature Programs", "Birdwatching", "Environment", "Audubon Center", "Volunteer", "Fitness", "Wellness", "Running + Walking"],
    family: ["Kids", "Zoo", "Carousel"]
  };

  // Event times are New York local strings like "2026-10-03T10:00:00".
  // Treat them as UTC internally so formatting never shifts them.
  function parts(s) {
    var m = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))), hasTime: !!m[4], day: m[1] + "-" + m[2] + "-" + m[3] };
  }
  function fmt(d, opts) { return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, opts)).format(d); }
  function time(p) { return fmt(p.date, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", " "); }
  function nowNY() {
    var s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    return s.replace(", ", "T");
  }

  function matches(e) {
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

  function card(e) {
    var s = parts(e.start), en = parts(e.end);
    var a = el("a", "ev-card");
    a.href = e.url;
    a.target = "_blank";
    a.rel = "noopener";

    if (e.image) {
      var img = el("img", "ev-thumb");
      img.src = e.image;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () { img.remove(); };
      a.appendChild(img);
    }

    var body = el("div", "ev-body");
    var meta = [];
    if (e.timesArePermitWindow) meta.push("Permitted " + (e.tags[0] || "event").toLowerCase());
    else if (s.hasTime) meta.push(time(s) + (en && en.hasTime && en.day === s.day ? "–" + time(en) : ""));
    else meta.push("All day");
    if (e.location) meta.push(e.location);
    body.appendChild(el("div", "ev-meta", meta.join(" · ")));
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

  function render() {
    var now = nowNY();
    var today = now.slice(0, 10);
    var shown = data.events.filter(function (e) {
      return (e.end || e.start) >= (e.end && e.end.length > 10 ? now : today) && matches(e);
    });

    list.innerHTML = "";
    if (!shown.length) {
      list.appendChild(el("p", "ev-status", "Nothing matches that filter right now — try another, or check back soon."));
      return;
    }

    var currentDay = null, group = null;
    shown.forEach(function (e) {
      var p = parts(e.start);
      // Multi-day events that started earlier are shown under today.
      var day = p.day < today ? today : p.day;
      if (day !== currentDay) {
        currentDay = day;
        var d = parts(day).date;
        var h = el("h2", "ev-day");
        h.textContent = day === today ? "Today" : fmt(d, { weekday: "long" });
        h.appendChild(el("span", null, fmt(d, { month: "long", day: "numeric" })));
        list.appendChild(h);
        group = el("div", "ev-group");
        list.appendChild(group);
      }
      group.appendChild(card(e));
    });
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      buttons.forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      filter = b.getAttribute("data-filter");
      render();
    });
  });
  freeOnly.addEventListener("change", render);

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
    });
})();
