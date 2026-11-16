// The wave director: turns a wave number into a queue of enemies, releases
// them on a timer, brings the boss in on the final wave, and says when the
// wave is clear. The world asks it every step; it owns no drawing.
import { FIELD, wavePlan } from './config.js';
import { createBoss, createEnemy } from './entities.js';

export function createDirector(random) {
  let queue = [];
  let spawnTimer = 0;
  let spawnGap = 1;
  let bossSpawned = false;
  let wave = 0;

  function buildQueue(nextWave) {
    const plan = wavePlan(nextWave);
    const kinds = [];
    for (let i = 0; i < plan.drifters; i += 1) kinds.push('drifter');
    for (let i = 0; i < plan.weavers; i += 1) kinds.push('weaver');
    for (let i = 0; i < plan.splitters; i += 1) kinds.push('splitter');
    for (let i = 0; i < plan.stingers; i += 1) kinds.push('stinger');
    // Shuffle so a wave never arrives in one boring block.
    for (let i = kinds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    queue = kinds;
    spawnGap = plan.spawnGap;
    spawnTimer = 0.4;
    bossSpawned = false;
    return plan.boss;
  }

  return {
    get wave() {
      return wave;
    },
    startWave(nextWave) {
      wave = nextWave;
      return buildQueue(nextWave);
    },
    // Release the next enemy when its time comes. Returns the spawned enemy
    // (or the boss) or null.
    update(dt, enemies) {
      if (queue.length === 0) return null;
      spawnTimer -= dt;
      if (spawnTimer > 0) return null;
      spawnTimer = spawnGap * random.range(0.7, 1.3);
      const kind = queue.shift();
      const x = random.range(50, FIELD.width - 50);
      const enemy = createEnemy(kind, x, -30, random, wave);
      enemies.push(enemy);
      return enemy;
    },
    spawnBoss(enemies) {
      if (bossSpawned) return null;
      bossSpawned = true;
      const boss = createBoss(random);
      enemies.push(boss);
      return boss;
    },
    get queueEmpty() {
      return queue.length === 0;
    },
    get wantsBoss() {
      return wave === 10 && !bossSpawned;
    },
  };
}
