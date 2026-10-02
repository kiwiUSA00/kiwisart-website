// Builds data/events.json from three public Brooklyn event sources.
// Runs on GitHub Actions (see .github/workflows/update-events.yml).
// No dependencies: Node 20+ (uses built-in fetch).
//
//   node scripts/build-events.mjs                 # fetch live feeds
//   node scripts/build-events.mjs --fixtures dir  # use saved files (testing)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DAYS_AHEAD = 92;   // how far ahead to list events (about 3 months)
const TZ = "America/New_York";

const SOURCES = {
  ppa: {
    name: "Prospect Park Alliance",
    home: "https://www.prospectpark.org/events/",
    // The feed only returns a few days at a time, so request several start dates.
    urls: (start) =>
      steps(4).map(
        (d) => `https://www.prospectpark.org/events/list/?ical=1&tribe-bar-date=${ymd(addDays(start, d))}`
      ),
  },
  bp: {
    name: "Brooklyn Borough President",
    home: "https://www.brooklynbp.nyc.gov/events/",
    urls: (start) =>
      steps(10).map(
        (d) => `https://www.brooklynbp.nyc.gov/events/list/?ical=1&tribe-bar-date=${ymd(addDays(start, d))}`
      ),
  },
  permits: {
    name: "NYC Permitted Events",
    home: "https://data.cityofnewyork.us/City-Government/NYC-Permitted-Event-Information/tvpp-9vvx",
  },
};

// Permit types worth listing (skips sports field bookings, film shoots, curb-lane permits).
const PERMIT_TYPES = [
  "Street Festival", "Single Block Festival", "Block Party", "Parade",
  "Farmers Market", "Plaza Event", "Plaza Partner Event", "Open Street Partner Event",
];

// Day offsets 0, n, 2n, … covering the whole DAYS_AHEAD window.
function steps(n) { const out = []; for (let d = 0; d < DAYS_AHEAD; d += n) out.push(d); return out; }

// ---------- dates (all times treated as New York local) ----------
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function ymd(d) { return d.toISOString().slice(0, 10); }
function nyToday() {
  // YYYY-MM-DD in New York
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(s + "T00:00:00Z");
}
// "20261003T110000" -> "2026-10-03T11:00:00"; "20261003" -> "2026-10-03"
function icsDate(v) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  if (!m[4]) return `${m[1]}-${m[2]}-${m[3]}`;
  if (m[7]) {
    // UTC -> New York local
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  }
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

// ---------- minimal iCal parser (VEVENT only) ----------
function parseICS(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n"); // unfold
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(";");
    const value = line.slice(i + 1);
    const key = name.toUpperCase();
    if (key === "ATTACH" && !params.some((p) => /FMTTYPE=image/i.test(p))) continue;
    cur[key] = value;
  }
  return events;
}
function unescapeText(s = "") {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}
function summarize(desc, max = 220) {
  const t = unescapeText(desc).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max)) + "…";
}

function fromICS(text, sourceKey) {
  return parseICS(text).map((e) => {
    const title = unescapeText(e.SUMMARY || "");
    const loc = unescapeText(e.LOCATION || "").replace(/,\s*United States$/, "");
    return {
      id: `${sourceKey}:${e.UID || title + e.DTSTART}`,
      title,
      start: icsDate(e.DTSTART || ""),
      end: icsDate(e.DTEND || ""),
      allDay: !/T/.test(e.DTSTART || ""),
      location: loc || (sourceKey === "ppa" ? "Prospect Park" : ""),
      summary: summarize(e.DESCRIPTION || ""),
      tags: (e.CATEGORIES ? unescapeText(e.CATEGORIES).split(",") : []).map((t) => t.trim()).filter(Boolean),
      image: e.ATTACH || null,
      url: (e.URL || "").trim() || SOURCES[sourceKey].home,
      source: sourceKey,
      canceled: /^cancell?ed\b/i.test(title) || /STATUS:CANCELLED/i.test(e.STATUS || ""),
    };
  });
}

function titleCase(s) {
  // Permit names are often ALL CAPS
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}
function streetCase(s) {
  // "SCHENCK AVENUE between NEW LOTS AVENUE" -> "Schenck Avenue between New Lots Avenue"
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Between|And|At|Of)\b/g, (w) => w.toLowerCase());
}
function fromPermits(rows) {
  // The dataset has one row per day for multi-day permits; keep each event_id once (earliest upcoming).
  const seen = new Map();
  for (const r of rows) {
    if (!seen.has(r.event_id)) seen.set(r.event_id, r);
  }
  return [...seen.values()].map((r) => ({
    id: `permits:${r.event_id}`,
    title: titleCase((r.event_name || "").trim()),
    start: (r.start_date_time || "").slice(0, 19),
    end: (r.end_date_time || "").slice(0, 19),
    allDay: false,
    timesArePermitWindow: true, // permit times include setup/breakdown
    location: streetCase((r.event_location || "").split(",")[0].replace(/\s+/g, " ").trim()),
    summary: "",
    tags: [r.event_type],
    image: null,
    url: SOURCES.permits.home,
    source: "permits",
    canceled: false,
  }));
}

// ---------- fetching ----------
async function get(url, asJson = false) {
  const res = await fetch(url, { headers: { "User-Agent": "kiwisart.com events page (GitHub Action)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asJson ? res.json() : res.text();
}

async function collect(fixtures) {
  const start = nyToday();
  const out = [];
  const errors = [];

  for (const key of ["ppa", "bp"]) {
    const urls = fixtures ? [path.join(fixtures, `${key}.ics`)] : SOURCES[key].urls(start);
    for (const u of urls) {
      try {
        const text = fixtures ? await readFile(u, "utf8") : await get(u);
        out.push(...fromICS(text, key));
      } catch (err) {
        // These calendars answer 404 for dates with nothing posted yet; that isn't a failure.
        if (/^404 /.test(err.message)) continue;
        errors.push(`${key}: ${err.message}`);
      }
    }
  }

  try {
    let rows;
    if (fixtures) {
      rows = JSON.parse(await readFile(path.join(fixtures, "permits.json"), "utf8"));
    } else {
      const until = ymd(addDays(start, DAYS_AHEAD));
      const types = PERMIT_TYPES.map((t) => `'${t}'`).join(",");
      const where = `event_borough='Brooklyn' AND event_type in(${types}) AND end_date_time >= '${ymd(start)}T00:00:00' AND start_date_time < '${until}T00:00:00'`;
      const url = "https://data.cityofnewyork.us/resource/tvpp-9vvx.json?" +
        new URLSearchParams({ $where: where, $order: "start_date_time", $limit: "2000" });
      rows = await get(url, true);
    }
    out.push(...fromPermits(rows));
  } catch (err) { errors.push(`permits: ${err.message}`); }

  return { events: out, errors, start };
}

// ---------- main ----------
const fxIdx = process.argv.indexOf("--fixtures");
const fixtures = fxIdx > -1 ? process.argv[fxIdx + 1] : null;
const outFile = path.resolve("data/events.json");

const { events, errors, start } = await collect(fixtures);
const todayStr = ymd(start);
const untilStr = ymd(addDays(start, DAYS_AHEAD));

const byId = new Map();
for (const e of events) {
  if (!e.start || !e.title || e.canceled) continue;
  const endDay = (e.end || e.start).slice(0, 10);
  if (endDay < todayStr) continue;            // already over
  if (e.start.slice(0, 10) >= untilStr) continue; // too far out
  byId.set(e.id, e);                           // dedupe across overlapping fetch windows
}
const list = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

// Never wipe the page if every source failed (e.g. a site outage): keep the old file.
if (list.length === 0 && errors.length) {
  console.error("No events and errors occurred; leaving existing data in place.\n" + errors.join("\n"));
  process.exit(1);
}

const payload = {
  updated: new Date().toISOString(),
  sources: Object.fromEntries(Object.entries(SOURCES).map(([k, v]) => [k, { name: v.name, home: v.home }])),
  errors,
  events: list,
};
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(payload, null, 1) + "\n");
console.log(`Wrote ${list.length} events to ${outFile}` + (errors.length ? `\nWarnings:\n${errors.join("\n")}` : ""));
