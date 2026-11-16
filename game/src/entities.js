// The things that move: the player skiff, the five enemy kinds plus the
// boss, bullets, pickups and particles. Each one is a plain object; the
// world advances them and the renderer draws them.
import { ENEMY, FIELD, PICKUP, PLAYER } from './config.js';

export function createPlayer() {
  return {
    kind: 'player',
    x: FIELD.width / 2,
    y: FIELD.height - 80,
    radius: PLAYER.radius,
    lives: 3,
    shield: 0,
    spread: 0,
    bombs: PLAYER.bombStart,
    fireTimer: 0,
    invulnerable: 0,
    tilt: 0,
  };
}

export function createEnemy(kind, x, y, random, wave) {
  const spec = ENEMY[kind];
  const hpBoost = kind === 'boss' ? 0 : Math.floor((wave - 1) / 4);
  return {
    kind,
    x,
    y,
    radius: spec.radius,
    hp: spec.hp + hpBoost,
    maxHp: spec.hp + hpBoost,
    speed: spec.speed * (1 + (wave - 1) * 0.04),
    score: spec.score,
    color: spec.color,
    t: random.next() * Math.PI * 2,
    phase: random.next() * Math.PI * 2,
    fireTimer: random.range(1.2, 2.4),
    dead: false,
  };
}

export function createBoss(random) {
  const boss = createEnemy('boss', FIELD.width / 2, -80, random, 10);
  boss.entering = true;
  return boss;
}

export function createBullet(x, y, vx, vy, friendly) {
  return { x, y, vx, vy, radius: friendly ? PLAYER.bulletRadius : 6, friendly, dead: false };
}

export function createPickup(x, y, kind, random) {
  return {
    kind,
    x,
    y,
    radius: 13,
    vy: 55,
    t: random.next() * Math.PI * 2,
    color: PICKUP[kind].color,
    label: PICKUP[kind].label,
    dead: false,
  };
}

export function createParticle(x, y, color, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life,
    maxLife: life,
    size,
    dead: false,
  };
}

export function burst(particles, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(x, y, color, speed * (0.3 + Math.random() * 0.7), 0.4 + Math.random() * 0.5, 2 + Math.random() * 3));
  }
}

// The background: three layers of stars drifting down at different speeds,
// plus a few slow aurora ribbons the renderer draws from the same list.
export function createStarfield(random) {
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      layer: 1 + Math.floor(random.next() * 3),
      size: 0.6 + random.next() * 1.8,
      twinkle: random.next() * Math.PI * 2,
    });
  }
  return stars;
}

export function driftStars(stars, dt) {
  for (const star of stars) {
    star.y += star.layer * 14 * dt;
    star.twinkle += dt * 2;
    if (star.y > FIELD.height + 2) {
      star.y = -2;
      star.x = Math.random() * FIELD.width;
    }
  }
}
