# Tally Tiles for www.kiwisart.com/tally/

Files in this folder
- `index.html` – the whole game (one file, works offline, includes the puzzle bank)
- `config.js` – leaderboard settings (empty = no leaderboard)
- `supabase.sql` – creates the leaderboard table (paste into Supabase once)

## 1. Put the game on your site
I could not see your site or repository, so I don't know how it is deployed. The address you gave
(github.com/kiwiUSA00) suggests GitHub Pages, but please confirm.
If kiwisart.com is served from a GitHub repo:
1. In that repo, create a folder named `tally` at the top level (the same level as the site's home page).
2. Upload `index.html` and `config.js` into it (GitHub: Add file > Upload files).
3. Wait a minute or two, then open www.kiwisart.com/tally/.
If your site is hosted somewhere else, upload the same folder to that host's `tally` directory.

## 2. Daily puzzles (nothing to run)
The game picks each day's puzzles from the built-in bank by the visitor's calendar date, so a new set appears at
local midnight with no server or scheduled job. The bank started on 2026-11-21 and repeats after its last day
(69 days: it repeats from 2027-01-30; Insane has 14 puzzles, so it repeats every 14 days). Before then, ask for a longer bank and re-upload `index.html`.

## 3. Leaderboard (your Supabase project already has the table; `config.js` already holds your URL and key)
A GitHub-hosted site is static, so scores need a small database. This uses Supabase.
1. Create a free project at supabase.com.
2. Open the SQL Editor, paste all of `supabase.sql`, and run it.
3. In the project's API settings, copy the Project URL and the publishable (or "anon") key.
   Never use a secret / service_role key.
4. Put both into `config.js`, upload it to the `tally` folder, and reload the game. A "Leaderboard" button appears
   on the home screen, and after a solved puzzle players can post a name.

How it ranks: per level, by puzzles solved, then total time. Views: Today and Last 7 days. Revealed puzzles don't count.
Players type a name; there are no accounts.

## Honest limits
- Times are measured in the visitor's browser, so a determined person can fake a score. Names are not moderated.
  To remove an entry, delete the row in Supabase (Table Editor > scores).
- "Today" uses each visitor's own calendar date, so people in different time zones near midnight may be on different days.
- The leaderboard code was tested against a mock server, not a live Supabase project. The Supabase SQL and API details
  follow Supabase's current docs, but please run the test below and tell me if anything fails.
- You are storing visitors' typed names and a random device id. Consider a one-line privacy note on the page.

Quick test after setup: solve an Easy puzzle, post a name, and confirm the score appears under Leaderboard > Easy > Today
(and in the Supabase table editor).
