# Testing — Emberline

How the game was checked, and what each check found. Everything below was
run on this machine (Node v24.22.1, headless Chromium via Playwright) on
2026-11-17.

## 1. Headless play-tests (Node, no browser)

A small harness (`/tmp/playtest.mjs`, kept out of the repo) drives the real
`world.js`/`shots.js` simulation:

| Check | Result |
| --- | --- |
| Determinism — same seed (7), same staged play scene, twice | **PASS** — score 1110, wave 4, kills 14, identical |
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
the frame is of the scene, not of the pilot's skill. All four were viewed
and checked by eye:

| File | Size | Shows |
| --- | --- | --- |
| `screenshots/1-title.png` | 143,157 B | Title panel, controls, ship, starfield |
| `screenshots/2-play.png` | 127,953 B | Wave 4 mid-fight: enemies, bullets, pickups, combo, HUD |
| `screenshots/3-boss.png` | 133,024 B | Wave 10: the Hollow Maw with health bar, radial bullets, shielded ship |
| `screenshots/4-victory.png` | 151,476 B | Victory panel, final score, boss-death particles |

Every file is under the 256 KiB cap and 1280 px on the long side. No
screenshot was edited or composited. Two staging defects were caught by
looking at them and fixed: the victory title overflowed its panel (long
titles now shrink), and staged ships were sometimes caught mid-blink
(invulnerability is cleared before painting a shot).

## 3. Build determinism

`main.ts` was run twice into two fresh output directories:

```
MAKEFUN_OUTPUT_DIR=out  node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256 out/dossier.json  = 3602303b39d15d8487bc6ffa8f8135c8e9968754305e6e439f8fc571f19e1ea9
sha256 out2/dossier.json = 3602303b39d15d8487bc6ffa8f8135c8e9968754305e6e439f8fc571f19e1ea9
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
- `game/` is 55,315 bytes in 12 files; `screenshots/` is 555,610 bytes in
  4 files — inside the 48 MiB / 993-file game caps. The whole submission
  (21 files, see README's layout plus LICENSE, README.md, TESTING.md,
  `.makefun/owner.json`) is 678,015 bytes.
- The game was also played in the browser through the screenshots' pages
  with no console or page errors reported by Playwright.
