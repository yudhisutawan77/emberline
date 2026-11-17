// The screenshot scenes behind ?shot=title|play|boss|victory|end. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (dodge the nearest threat, chase the
// lowest enemy, shoot always), so the frame is what a real game looks like
// and the same seed always gives the same frame. The victory and boss scenes
// fast-forward through earlier waves with the pilot kept alive, because the
// shot is of the scene, not of the pilot's skill.
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;

/** Seconds until the player, moving at `direction`, is hit by something. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  const speed = 340;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - 20, Math.max(20, player.x + direction * speed * t));
    const y = player.y;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const ey = enemy.y + enemy.speed * t;
      if (Math.abs(ey - y) < enemy.radius + player.radius + 6 && Math.abs(enemy.x - x) < enemy.radius + player.radius + 8) return t;
    }
    for (const bullet of state.enemyBullets) {
      if (bullet.dead) continue;
      const bx = bullet.x + bullet.vx * t;
      const by = bullet.y + bullet.vy * t;
      if (Math.abs(by - y) < player.radius + 8 && Math.abs(bx - x) < player.radius + 8) return t;
    }
  }
  return Infinity;
}

function autopilot(state, horizon) {
  const player = state.player;
  let best = 0;
  let bestTime = timeToHit(state, 0, horizon);
  for (const direction of [-1, 1]) {
    const time = timeToHit(state, direction, horizon);
    if (time > bestTime) {
      bestTime = time;
      best = direction;
    }
  }
  // Drift toward the lowest enemy so the shots land.
  if (bestTime === Infinity) {
    let target = null;
    for (const enemy of state.enemies) {
      if (!enemy.dead && (!target || enemy.y > target.y)) target = enemy;
    }
    if (target) {
      const centre = player.x;
      if (target.x > centre + 10) best = 1;
      else if (target.x < centre - 10) best = -1;
    }
  }
  return {
    x: best,
    y: 0,
    shooting: true,
    mouse: { x: player.x, y: player.y, down: false, seen: false },
    actions: new Set(),
    hadFocus: true,
  };
}

function runSteps(world, seconds, horizon, keepAlive) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (keepAlive) world.state.player.invulnerable = 999;
    events = world.step(STEP, autopilot(world.state, horizon), null);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'victory' && name !== 'end') {
    world.beginWave(1);
    runSteps(world, 3, 0.7, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    world.beginWave(1);
    // A passive pilot: it never moves, so the void catches it.
    let events = 0;
    for (let i = 0; i < 600 / STEP && !(events & EVENT_OVER); i += 1) {
      events = world.step(STEP, { x: 0, y: 0, shooting: false, mouse: { x: 0, y: 0, down: false, seen: false }, actions: new Set(), hadFocus: true }, null);
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'play') {
    // Wave 6, 14 s in: the densest mid-fight frame the probe found
    // (6 live enemies, combo x3, ~78 particles, 4 pickups on screen,
    // score 1600) — wave 4 at 14 s is already mostly cleared out.
    world.beginWave(6);
    runSteps(world, 14, 0.7, false);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Boss and victory: one single pass from wave 1. The world advances waves
  // itself when one clears, so re-beginning a wave would replay it and
  // inflate the score; step until the boss is on screen (or the game is
  // won), with the pilot kept alive so the scene is of the fight, not of
  // the pilot's skill.
  world.beginWave(1);
  let guard = 0;
  let events = 0;
  const limit = 900 / STEP;
  while (guard < limit) {
    world.state.player.invulnerable = 999;
    events = world.step(STEP, autopilot(world.state, 0.7), null);
    if (events & EVENT_WIN) break;
    // Wait until the boss has fully entered the field before stopping.
    if (name === 'boss' && world.state.boss && world.state.boss.y >= 110) break;
    guard += 1;
  }
  if (name === 'boss') {
    // Five more seconds of the fight, so the frame shows the boss
    // mid-battle with a dense bullet ring out (29 live enemy bullets at
    // 5 s, vs 16 at 3 s), not just arriving.
    runSteps(world, 5, 0.7, true);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Victory: keep fighting the boss until it falls.
  guard = 0;
  while (!(events & EVENT_WIN) && guard < 600 / STEP) {
    world.state.player.invulnerable = 999;
    events = world.step(STEP, autopilot(world.state, 0.7), null);
    guard += 1;
  }
  return { screen: SCREEN_WIN, best: world.state.score };
}
