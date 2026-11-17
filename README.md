[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

[![rank](https://make.fun/badge/best-game-01/yudhisutawan77/emberline/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

[![reward](https://make.fun/badge/best-game-01/yudhisutawan77/emberline/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberline

**Emberline** is a neon vertical arcade defender: pilot the ember-skiff
*Kestrel* down the last glowing horizon and hold the Ember Line through
**10 escalating waves** against **5 enemy kinds** — drifters, weavers,
splitters that break in two, stingers that shoot back — and the wave-10
boss, the **Hollow Maw** (220 HP, radial bullet rings, spawns shardlings).
Kills in a row build a **combo multiplier up to ×5**; one hit resets it.
Falling shards drop **4 pickups** (spread shot, shield, +1 life, bomb),
with 3 lives, a screen-clearing bomb, synthesised WebAudio sound and music,
and a best score kept between runs. Built for make.fun's **best-game-01**
("Make the best game").

You are the keeper of the **Ember Line**, the last glowing horizon. Void shards
fall from the dark — shoot them down, catch what they drop, and survive all ten
waves. On wave 10 the **Hollow Maw** rises: break it, and the line burns bright.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` — see below).
No network, no build step, no files outside `game/`.

| Key | Action |
| --- | --- |
| Arrows / WASD / mouse | Move the skiff (mouse steers when no key is held) |
| Space / Z / hold mouse | Shoot |
| B | Bomb — clears the sky (12 damage to the boss) |
| P | Pause |
| M | Mute |
| R | Restart |
| Enter / click | Start, or play again after the end |

## The game

- **10 waves, escalating.** Drifters fall straight; weavers sine across the
  sky; splitters break into two shardlings; stingers shoot back. Wave 10 is
  the boss: the Hollow Maw (220 HP) fires radial bullet rings and spawns
  shardlings while it drifts.
- **Combo scoring.** Kills in a row raise the multiplier to ×5; one hit
  resets it. Wave-clear bonus is 250 × wave.
- **Pickups.** Spread shot (three-way fire), shield (absorbs a hit, stacks
  to 3), +1 life, bomb (max 3). Each kind has its own mark so you can read
  it at a glance.
- **Lives and feel.** 3 lives, 2 s of invulnerability after a hit, screen
  shake, particle bursts, floating score text, a parallax starfield and slow
  aurora ribbons. Synthesised WebAudio sound effects and a quiet music loop
  (M mutes); there are no audio files.
- **Win / lose.** Defeat the boss to win; lose all lives and the line falls.
  Best score is kept in `localStorage`.

## Run it

```sh
node dev/serve.mjs            # serves game/ on http://localhost:8080
```

Screenshots are staged, not drawn: open
`http://localhost:8080/index.html?shot=title|play|boss|victory&seed=7` —
each scene plays the real rules forward from a fresh world (see
`game/src/shots.js`) and sets `window.__shotReady` when painted. Take them
with `node dev/shot.mjs` (Playwright + headless Chromium).

## Layout

```
main.ts                  hand-in program: copies game/ + screenshots/ to
                         /output and writes /output/dossier.json
vendor/makefun-game.ts   the kit's dossier library, unchanged
game/
  index.html             page shell + how-to-play
  app.css                page chrome around the canvas
  src/
    config.js            field, balance, wave plans, palette
    random.js            seeded RNG (mulberry32)
    audio.js             synthesised SFX + music loop
    input.js             keyboard + mouse
    entities.js          factories: player, enemies, boss, bullets,
                         pickups, particles, starfield
    waves.js             wave director: spawn queue, boss arrival
    world.js             rules: fixed-step simulation, collisions,
                         scoring, combo, bombs, win/lose
    render.js            all canvas drawing + screens
    shots.js             autopilot-staged screenshot scenes
    main.js              boot, fixed-step loop, screen state machine
screenshots/            1-title, 2-play, 3-boss, 4-victory (real renders)
dev/                     serve.mjs + shot.mjs (dev only, not submitted)
```

## License

MIT — see `LICENSE`.
