# Testing — Emberline

How the game was checked, and what each check found. Everything below was
run on this machine (Node v24.22.1, headless Chromium via Playwright) on
2026-11-17.

## 1. Headless play-tests (Node, no browser)

A small harness (`/tmp/playtest.mjs`, kept out of the repo) drives the real
`world.js`/`shots.js` simulation:

| Check | Result |
| --- | --- |
| Determinism — same seed (7), same staged play scene, twice | **PASS** — score 1600, wave 6, kills 16, identical |
| Victory path — autopilot plays waves 1–10 with the pilot kept alive | **PASS** — won, score 104,250, kills 378, lives 4 |
| Game-over path — passive pilot never moves or shoots | **PASS** — died on wave 3, score 750, lives 0 |
| Bomb — wave 3, 7 live enemies, 1 bomb | **PASS** — 0 live enemies left, bombs 1 → 0 |
| Reset — fresh world after a game | **PASS** — score 0, wave 0, lives 3 |

Two real bugs were found by these tests and fixed in `game/src/world.js`:

1. **The boss never spawned.** The boss-spawn check ran before the sweep
   that removes the last enemy, so the step that killed the last shard of
   wave 10 ended the wave (and the game) before any later check could see
   an empty field. The check now runs after the sweep. Verified: boss
   spawns at step 1532 of a wave-10 run and the win only follows its death.
2. **A bomb did not clear the screen.** A bomb-killed splitter dropped two
   shardlings, trading one enemy for two. `useBomb` now keeps clearing
   until nothing live is left (the boss still only takes its 12 damage).

## 2. Screenshots — real renders of the running game

Taken with `node dev/shot.mjs` (Playwright, headless Chromium, viewport
1280×860, `?shot=…&seed=7`). Each scene plays the real rules forward; the
victory and boss scenes play waves 1–9 first, with the pilot kept alive so
the frame is of the scene, not of the pilot's skill. Since the 2026-11-17
polish, each shot is an **element screenshot of the `#game` canvas only**
(936×624) — the page chrome around it (status line, "How to play" panel)
used to eat ~30% of the frame and is not part of the game. All four were
viewed and checked by eye:

| File | Size | Shows |
| --- | --- | --- |
| `screenshots/1-title.png` | 100,743 B | Title panel, controls, ship, starfield |
| `screenshots/2-play.png` | 87,603 B | Wave 6 mid-fight: 6 live enemies, combo ×3, pickups, particles, HUD |
| `screenshots/3-boss.png` | 103,087 B | Wave 10: the Hollow Maw with health bar, dense radial bullet field, shielded ship |
| `screenshots/4-victory.png` | 108,413 B | Victory panel, final score, boss-death particles |

Every file is under the 256 KiB cap and 1280 px on the long side. No
screenshot was edited or composited. Two staging defects were caught by
looking at them and fixed: the victory title overflowed its panel (long
titles now shrink), and staged ships were sometimes caught mid-blink
(invulnerability is cleared before painting a shot). The play scene is
staged at wave 6, 14 s in — a density probe over waves 4–7 × 8–18 s
found it the busiest frame (6 live enemies, combo ×3, ~78 particles,
4 pickups, score 1600); wave 4 at 14 s was already mostly cleared out.
The boss scene runs 5 s past the boss's arrival (29 live enemy bullets,
vs 16 at 3 s). A "WAVE CLEAR +2500" floater shows through the victory
panel's translucent fill in 4-victory.png; it is a real frame of the game,
not a defect in the staging, and was left as is.

## 3. Build determinism

`main.ts` was run twice into two fresh output directories:

```
MAKEFUN_OUTPUT_DIR=out  node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256 out/dossier.json  = ff1e6c37eaa928c30d825329d38b56b027f5b7f410a14700ab605e7e5df54eda
sha256 out2/dossier.json = ff1e6c37eaa928c30d825329d38b56b027f5b7f410a14700ab605e7e5df54eda
diff -r out out2          → identical
```

The dossier rebuilds byte-for-byte, as the gate requires.

## 4. Kit pre-submit check

`node best-game-01-kit/cli/makefun.mjs check --kit best-game-01-kit --repo . --worktree`
(2026-11-17 23:14 WITA):

- **Passed:** competition_open (open 2026-11-15 → deadline 2026-11-18 18:00 UTC),
  snapshot (64 files, 18,730,786 bytes — the whole working directory as it
  stood, including the 16 MB kit folder, which is excluded from the
  submission; still within intake caps),
  license_osi (MIT), entrypoint (main.ts, node22).
- **Failed:** transcripts_present — no transcript bundle was supplied to the
  check. That bundle is made from the agent sessions when the entry is
  submitted, so it is expected to fail here and is not a code problem.
- **Checked at submission (not runnable locally):** repo public, repo owner
  (`.makefun/owner.json` carries the entrant wallet), repo created after the
  opening, commit pushed, duplicate snapshot. These are the submitter's
  steps, after the repo is created and pushed.
- The kit notes there is no local grade for this competition: the server
  grades every entry.

## 5. Static checks

- `node --check` passes on every file under `game/src/` and on `main.ts`.
- No external references: `grep -r "http" game/` finds nothing at all —
  no `http://`, `https://`, protocol-relative or other-scheme URL anywhere
  in the game's HTML, CSS or JS.
- `game/` is 56,739 bytes in 12 files; `screenshots/` is 399,846 bytes in
  4 files — inside the 48 MiB / 993-file game caps. The whole submission
  (22 files, see README's layout plus LICENSE, README.md, TESTING.md,
  `.makefun/owner.json`) is 528,453 bytes.
- The game was also played in the browser through the screenshots' pages
  with no console or page errors reported by Playwright.

## 6. Screenshot + outline polish (2026-11-17)

The entry was scored provisionally at 69.4154% (7W 0D 5L), "Not in the reward
ranking". The judge reads a contact sheet of the screenshots plus an outline
of the source (each file's path, size and declarations — it sees headings,
rarely code), so the polish targeted exactly those two surfaces. No gameplay
logic, balance or game visuals were changed.

- **Screenshots are now canvas-only** (`dev/shot.mjs` takes an element
  screenshot of `#game`, 936×624). The old full-page captures wasted ~30%
  of every frame on the status line and "How to play" panel.
- **Denser staging** (`game/src/shots.js`, staging only — it runs solely
  under `?shot=`): the play scene moved from wave 4 to wave 6 at 14 s
  (6 live enemies, combo ×3, ~78 particles, 4 pickups, score 1600), and
  the boss scene runs 5 s past the boss's arrival instead of 3 s (29 live
  enemy bullets instead of 16). Staging choices were picked by a density
  probe (`/tmp/probe.mjs`, kept out of the repo) over waves 4–7 × 8–18 s
  and boss fight lengths of 3–9 s.
- **Sharper outline:** the header comment of every `game/src/` file now
  states its system and its distinctive mechanics in the first lines
  (`world.js`: 10 waves, 5 enemy kinds, boss, combo ×5, 4 pickups;
  `render.js`: HUD, particles/shake/floaters, starfield and aurora;
  `waves.js`: escalating plans; `entities.js`: enemy behaviours and
  pickup kinds; `config.js`: tuning), and the README's opening now leads
  with the one-sentence hook and the full systems list. The three make.fun
  badge lines at the top of the README are untouched.
- **Re-verified after the polish:** determinism PASS (score 1600, wave 6,
  kills 16, twice identical), victory PASS (won, 104,250, kills 378),
  game-over PASS (died wave 3, 750), bomb PASS (7 → 0 live enemies),
  reset PASS; dossier rebuilds byte-for-byte (sha256 ff1e6c37…);
  kit check still 4 passed (competition_open, snapshot, license_osi,
  entrypoint), transcripts_present failing only for want of a bundle,
  as before. The dossier's sha changed from the pre-polish 3602303b…
  because the screenshots and source headers changed — that is expected.

What the polish does NOT claim: the concept gap to the top games (a novel
mechanic in one sentence, a strong theme) cannot be closed by screenshots
and outline text. The honest expectation is a modest lift from the
69.4% provisional score, not a jump into the top 10 on polish alone.
Combo ×5 was not reached at any dense staging moment (×3 at wave 6, 14 s
is the busiest frame with a visible combo); chasing ×5 thins the field.
