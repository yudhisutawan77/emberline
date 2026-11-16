// The world: everything the game is. It owns the state, advances it in fixed
// steps, and reports what happened as event flags. It draws nothing and
// knows nothing about the DOM.
import { ENEMY, FIELD, FINAL_WAVE, PICKUP, PLAYER, STEP, wavePlan } from './config.js';
import { burst, createBoss, createPickup, createPlayer, createStarfield, driftStars } from './entities.js';
import { createDirector } from './waves.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE = 8;
export const EVENT_BOSS = 16;
export const EVENT_PICKUP = 32;

const COMBO_WINDOW = 3;
const COMBO_STEP = 8;
const MAX_MULTIPLIER = 5;

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const director = createDirector(random);
  const state = freshState();

  function freshState() {
    return {
      player: createPlayer(),
      enemies: [],
      bullets: [],
      enemyBullets: [],
      pickups: [],
      particles: [],
      floaters: [],
      stars: createStarfield(random),
      score: 0,
      best: 0,
      combo: 0,
      comboTimer: 0,
      multiplier: 1,
      wave: 0,
      waveState: 'idle',
      waveTimer: 0,
      boss: null,
      shake: 0,
      time: 0,
      kills: 0,
      shotsFired: 0,
    };
  }

  function reset() {
    const fresh = freshState();
    for (const key of Object.keys(fresh)) state[key] = fresh[key];
  }

  function addScore(base, x, y) {
    const gained = base * state.multiplier;
    state.score += gained;
    state.floaters.push({ x, y, text: `+${gained}`, life: 0.9, maxLife: 0.9, color: '#ffd166' });
    return gained;
  }

  function bumpCombo() {
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(state.combo / COMBO_STEP));
  }

  function dropPickup(x, y) {
    const roll = random.next();
    let kind = null;
    if (roll < 0.05) kind = 'life';
    else if (roll < 0.16) kind = 'bomb';
    else if (roll < 0.32) kind = 'shield';
    else if (roll < 0.52) kind = 'spread';
    if (kind) state.pickups.push(createPickup(x, y, kind, random));
  }

  function killEnemy(enemy, award) {
    enemy.dead = true;
    state.kills += 1;
    burst(state.particles, enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 60 : 16, enemy.kind === 'boss' ? 260 : 170);
    if (award) {
      addScore(enemy.score, enemy.x, enemy.y);
      bumpCombo();
      dropPickup(enemy.x, enemy.y);
    }
    if (enemy.kind === 'splitter') {
      for (const dx of [-26, 26]) {
        const child = {
          kind: 'shardling', x: enemy.x + dx, y: enemy.y, radius: ENEMY.shardling.radius,
          hp: 1, maxHp: 1, speed: ENEMY.shardling.speed, score: ENEMY.shardling.score,
          color: ENEMY.shardling.color, t: 0, phase: random.next() * Math.PI * 2,
          fireTimer: 0, dead: false,
        };
        state.enemies.push(child);
      }
    }
    if (enemy.kind === 'boss') state.boss = null;
  }

  function damagePlayer() {
    const player = state.player;
    if (player.invulnerable > 0) return 0;
    if (player.shield > 0) {
      player.shield -= 1;
      player.invulnerable = 1.2;
      burst(state.particles, player.x, player.y, '#80ed99', 18, 200);
      return EVENT_HIT;
    }
    player.lives -= 1;
    player.invulnerable = PLAYER.invulnerableSeconds;
    player.spread = 0;
    state.combo = 0;
    state.multiplier = 1;
    state.shake = 14;
    burst(state.particles, player.x, player.y, '#ff7b2f', 40, 260);
    if (player.lives <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  function useBomb() {
    const player = state.player;
    if (player.bombs <= 0) return 0;
    player.bombs -= 1;
    state.shake = 18;
    burst(state.particles, player.x, player.y, '#ffd166', 50, 320);
    for (const bullet of state.enemyBullets) bullet.dead = true;
    for (const enemy of state.enemies) {
      if (enemy.kind === 'boss') {
        enemy.hp -= 12;
        if (enemy.hp <= 0) killEnemy(enemy, true);
      }
    }
    // Clear everything else. A dying splitter drops shardlings, so keep
    // going until nothing live is left — a bomb clears the sky, it does
    // not trade one enemy for two.
    let pending = true;
    while (pending) {
      pending = false;
      for (const enemy of state.enemies) {
        if (!enemy.dead && enemy.kind !== 'boss') {
          killEnemy(enemy, true);
          pending = true;
        }
      }
    }
    return EVENT_HIT;
  }

  function firePlayerBullet() {
    const player = state.player;
    const spread = player.spread;
    const angles = spread >= 2 ? [-0.16, 0, 0.16] : spread === 1 ? [-0.09, 0.09] : [0];
    for (const angle of angles) {
      const vx = Math.sin(angle) * PLAYER.bulletSpeed;
      const vy = -Math.cos(angle) * PLAYER.bulletSpeed;
      state.bullets.push({ x: player.x, y: player.y - 20, vx, vy, radius: PLAYER.bulletRadius, friendly: true, dead: false });
    }
    state.shotsFired += 1;
  }

  function updatePlayer(dt, input, audio) {
    const player = state.player;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    // Keyboard steers; the mouse steers when it moved and no key is held.
    let mx = input.x;
    let my = input.y;
    if (mx === 0 && my === 0 && input.mouse.seen) {
      const dx = input.mouse.x - player.x;
      const dy = input.mouse.y - player.y - 40;
      if (Math.abs(dx) > 6) mx = Math.sign(dx);
      if (Math.abs(dy) > 10) my = Math.sign(dy);
    }
    player.x = Math.max(20, Math.min(FIELD.width - 20, player.x + mx * PLAYER.speed * dt));
    player.y = Math.max(FIELD.height * 0.45, Math.min(FIELD.height - 24, player.y + my * PLAYER.speed * dt));
    player.tilt = mx * 0.35;
    player.fireTimer -= dt;
    if (input.shooting && player.fireTimer <= 0) {
      player.fireTimer = PLAYER.fireInterval;
      firePlayerBullet();
      if (audio) audio.shoot();
    }
    if (input.actions.has('bomb')) useBomb();
  }

  function updateEnemies(dt, audio) {
    const player = state.player;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      enemy.t += dt;
      if (enemy.kind === 'boss') {
        if (enemy.entering) {
          enemy.y += 60 * dt;
          if (enemy.y >= 110) enemy.entering = false;
        } else {
          enemy.x += Math.sin(enemy.t * 0.9) * 90 * dt;
          enemy.x = Math.max(90, Math.min(FIELD.width - 90, enemy.x));
          enemy.fireTimer -= dt;
          if (enemy.fireTimer <= 0) {
            enemy.fireTimer = 1.1;
            const burstCount = 8;
            for (let i = 0; i < burstCount; i += 1) {
              const angle = (i / burstCount) * Math.PI * 2 + enemy.t;
              state.enemyBullets.push({
                x: enemy.x, y: enemy.y + 40,
                vx: Math.cos(angle) * 130, vy: Math.sin(angle) * 130 + 60,
                radius: 6, friendly: false, dead: false,
              });
            }
            if (audio) audio.bossRoar();
          }
          if (random.next() < dt * 0.35) {
            const child = {
              kind: 'shardling', x: enemy.x, y: enemy.y + 50, radius: ENEMY.shardling.radius,
              hp: 1, maxHp: 1, speed: ENEMY.shardling.speed, score: ENEMY.shardling.score,
              color: ENEMY.shardling.color, t: 0, phase: random.next() * Math.PI * 2,
              fireTimer: 0, dead: false,
            };
            state.enemies.push(child);
          }
        }
        continue;
      }
      const base = enemy.speed;
      if (enemy.kind === 'drifter') {
        enemy.y += base * dt;
        enemy.x += Math.sin(enemy.t * 1.4 + enemy.phase) * 22 * dt;
      } else if (enemy.kind === 'weaver') {
        enemy.y += base * dt;
        enemy.x += Math.sin(enemy.t * 3.2 + enemy.phase) * 130 * dt;
      } else if (enemy.kind === 'splitter' || enemy.kind === 'shardling') {
        enemy.y += base * dt;
        enemy.x += Math.sin(enemy.t * 2 + enemy.phase) * 40 * dt;
      } else if (enemy.kind === 'stinger') {
        enemy.y += base * dt;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0 && enemy.y > 0 && enemy.y < FIELD.height * 0.6) {
          enemy.fireTimer = random.range(1.8, 2.8);
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const len = Math.hypot(dx, dy) || 1;
          state.enemyBullets.push({
            x: enemy.x, y: enemy.y + 12,
            vx: (dx / len) * 190, vy: (dy / len) * 190,
            radius: 6, friendly: false, dead: false,
          });
        }
      }
      if (enemy.y > FIELD.height + 40) enemy.dead = true;
    }
  }

  function updateBullets(dt) {
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y < -20 || bullet.x < -20 || bullet.x > FIELD.width + 20) bullet.dead = true;
    }
    for (const bullet of state.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y > FIELD.height + 20 || bullet.x < -20 || bullet.x > FIELD.width + 20) bullet.dead = true;
    }
  }

  function collide(audio) {
    let events = 0;
    // Player bullets vs enemies.
    for (const bullet of state.bullets) {
      if (bullet.dead) continue;
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.y < -20) continue;
        if (circleHit(bullet, enemy)) {
          bullet.dead = true;
          enemy.hp -= 1;
          burst(state.particles, bullet.x, bullet.y, enemy.color, 5, 120);
          if (enemy.hp <= 0) {
            killEnemy(enemy, true);
            if (audio) audio.explosion(enemy.kind === 'boss');
          } else if (audio) audio.hit();
          break;
        }
      }
    }
    // Enemies and their bullets vs the player.
    const player = state.player;
    for (const enemy of state.enemies) {
      if (!enemy.dead && circleHit(enemy, player)) {
        killEnemy(enemy, false);
        events |= damagePlayer();
        if (audio) audio.explosion(false);
      }
    }
    for (const bullet of state.enemyBullets) {
      if (!bullet.dead && circleHit(bullet, player)) {
        bullet.dead = true;
        events |= damagePlayer();
        if (audio) audio.hit();
      }
    }
    // Pickups vs the player.
    for (const pickup of state.pickups) {
      if (!pickup.dead && circleHit(pickup, player)) {
        pickup.dead = true;
        if (pickup.kind === 'spread') player.spread = Math.min(2, player.spread + 1);
        else if (pickup.kind === 'shield') player.shield = Math.min(3, player.shield + 1);
        else if (pickup.kind === 'life') player.lives = Math.min(5, player.lives + 1);
        else if (pickup.kind === 'bomb') player.bombs = Math.min(3, player.bombs + 1);
        state.floaters.push({ x: player.x, y: player.y - 34, text: PICKUP[pickup.kind].label, life: 1, maxLife: 1, color: pickup.color });
        burst(state.particles, player.x, player.y, pickup.color, 14, 160);
        events |= EVENT_PICKUP;
        if (audio) audio.pickup();
      }
    }
    return events;
  }

  function sweep(list) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].dead) list.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) p.dead = true;
    }
    sweep(state.particles);
    for (const f of state.floaters) {
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) f.dead = true;
    }
    sweep(state.floaters);
  }

  function beginWave(wave) {
    state.wave = wave;
    state.waveState = 'intro';
    state.waveTimer = 2.2;
    const hasBoss = director.startWave(wave);
    return { hasBoss };
  }

  // One fixed step of play. Returns event flags for the frame.
  function step(dt, input, audio) {
    let events = 0;
    state.time += dt;
    driftStars(state.stars, dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    updatePlayer(dt, input, audio);
    updateParticles(dt);

    if (state.waveState === 'intro') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.waveState = 'fight';
        if (audio) audio.waveHorn();
        events |= EVENT_WAVE;
      }
      return events;
    }

    if (state.waveState === 'fight') {
      director.update(dt, state.enemies);
      updateEnemies(dt, audio);
      updateBullets(dt);
      for (const pickup of state.pickups) {
        pickup.y += pickup.vy * dt;
        pickup.t += dt;
        if (pickup.y > FIELD.height + 20) pickup.dead = true;
      }
      events |= collide(audio);
      sweep(state.enemies);
      sweep(state.bullets);
      sweep(state.enemyBullets);
      sweep(state.pickups);
      if (events & EVENT_OVER) return events;
      // The boss rises only once the last shard of wave 10 is gone. This
      // check has to sit after the sweep: the step that kills the last
      // enemy is also the step the wave would otherwise end on, so a check
      // before the sweep never sees an empty field.
      if (director.wantsBoss && director.queueEmpty && state.enemies.length === 0) {
        state.boss = director.spawnBoss(state.enemies);
        if (audio) audio.bossRoar();
        events |= EVENT_BOSS;
      }
      const waveDone = director.queueEmpty && state.enemies.length === 0 && !state.boss;
      if (waveDone) {
        const bonus = 250 * state.wave;
        state.score += bonus;
        state.floaters.push({ x: FIELD.width / 2, y: FIELD.height / 2 - 40, text: `WAVE ${state.wave} CLEAR  +${bonus}`, life: 1.6, maxLife: 1.6, color: '#ffd166' });
        if (state.wave === FINAL_WAVE) {
          state.waveState = 'done';
          return events | EVENT_WIN;
        }
        state.waveState = 'clear';
        state.waveTimer = 2.4;
      }
      return events;
    }

    if (state.waveState === 'clear') {
      updateEnemies(dt, audio);
      updateBullets(dt);
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) beginWave(state.wave + 1);
      return events;
    }
    return events;
  }

  return {
    state,
    reset,
    step,
    beginWave,
    useBomb,
    get plan() {
      return state.wave === 0 ? null : wavePlan(state.wave);
    },
  };
}
