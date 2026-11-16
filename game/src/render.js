// Every pixel the player sees. The renderer draws the world state plus one
// screen overlay (title, play, paused, game over, victory). It never changes
// the world; the game loop owns that.
import { FIELD, FINAL_WAVE, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const width = FIELD.width;
  const height = FIELD.height;

  function drawBackground(state, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    // Slow aurora ribbons.
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 1 ? PALETTE.cyan : PALETTE.violet;
      ctx.beginPath();
      const base = 90 + i * 130 + Math.sin(time * 0.3 + i * 2) * 18;
      ctx.moveTo(0, base);
      for (let x = 0; x <= width; x += 60) {
        ctx.lineTo(x, base + Math.sin(x * 0.008 + time * 0.5 + i * 1.7) * 34);
      }
      ctx.lineTo(width, base + 26);
      ctx.lineTo(0, base + 26);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Stars.
    for (const star of state.stars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(star.twinkle));
      ctx.globalAlpha = alpha * (0.4 + star.layer * 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    // The Ember Line: the glowing horizon the player defends.
    const glow = ctx.createLinearGradient(0, height - 26, 0, height);
    glow.addColorStop(0, 'rgba(255,123,47,0)');
    glow.addColorStop(1, 'rgba(255,123,47,0.5)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, height - 26, width, 26);
    ctx.fillStyle = PALETTE.horizon;
    ctx.fillRect(0, height - 3, width, 3);
  }

  function drawPlayer(player, time) {
    if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);
    // Engine flame.
    const flame = 10 + Math.sin(time * 30) * 4;
    ctx.fillStyle = '#ff9e00';
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(0, 14 + flame);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();
    // Hull: a swept ember skiff.
    ctx.shadowColor = PALETTE.ember;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(13, 8);
    ctx.lineTo(7, 14);
    ctx.lineTo(-7, 14);
    ctx.lineTo(-13, 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(0, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0620';
    ctx.beginPath();
    ctx.arc(0, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Shield ring.
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(128,237,153,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = enemy.color;
    if (enemy.kind === 'drifter') {
      ctx.rotate(enemy.t * 0.8);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * enemy.radius;
        const py = Math.sin(a) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b0620';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'weaver') {
      ctx.rotate(Math.sin(enemy.t * 2) * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius * 0.8, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'splitter') {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#0b0620';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-enemy.radius * 0.6, 0);
      ctx.lineTo(enemy.radius * 0.6, 0);
      ctx.moveTo(0, -enemy.radius * 0.6);
      ctx.lineTo(0, enemy.radius * 0.6);
      ctx.stroke();
    } else if (enemy.kind === 'shardling') {
      ctx.rotate(enemy.t * 2.5);
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, enemy.radius);
      ctx.lineTo(-enemy.radius, enemy.radius);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'stinger') {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius - 4);
      ctx.lineTo(enemy.radius, enemy.radius * 0.7);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'boss') {
      // The Hollow Maw: a big ringed void with a burning core.
      ctx.rotate(Math.sin(enemy.t * 0.6) * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1b0f38';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.34 + Math.sin(time * 5) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.magenta;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + enemy.t * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (enemy.radius - 6), Math.sin(a) * (enemy.radius - 6));
        ctx.lineTo(Math.cos(a) * (enemy.radius + 10), Math.sin(a) * (enemy.radius + 10));
        ctx.stroke();
      }
      // Boss health bar above the boss.
      const w = 130;
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(11,6,32,0.8)';
      ctx.fillRect(-w / 2, -enemy.radius - 22, w, 9);
      ctx.fillStyle = '#ff2e63';
      ctx.fillRect(-w / 2, -enemy.radius - 22, w * ratio, 9);
    }
    ctx.restore();
  }

  function drawHud(state, screen, best) {
    ctx.save();
    ctx.textBaseline = 'top';
    // Top bar.
    ctx.fillStyle = 'rgba(11,6,32,0.55)';
    ctx.fillRect(0, 0, width, 46);
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${state.score}`, 16, 12);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`BEST ${best}`, 16, 32);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${FINAL_WAVE}`, width / 2, 12);
    if (state.multiplier > 1) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.multiplier}`, width / 2, 32);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff70a6';
    ctx.font = 'bold 18px system-ui, sans-serif';
    let lives = '';
    for (let i = 0; i < state.player.lives; i += 1) lives += '♥ ';
    ctx.fillText(lives || '—', width - 16, 12);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px system-ui, sans-serif';
    const shield = state.player.shield > 0 ? `SHIELD ${state.player.shield}   ` : '';
    ctx.fillText(`${shield}BOMB ${state.player.bombs}   [B]`, width - 16, 32);
    // Wave intro banner.
    if (state.waveState === 'intro' && screen === SCREEN_PLAY) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.ember;
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(state.wave === FINAL_WAVE ? 'THE HOLLOW MAW' : `WAVE ${state.wave}`, width / 2, height / 2 - 60);
      ctx.fillStyle = PALETTE.white;
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(
        state.wave === FINAL_WAVE ? 'Defeat the boss to light the Ember Line' : 'Clear the void shards',
        width / 2,
        height / 2 - 8,
      );
    }
    ctx.restore();
  }

  function drawCenterPanel(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(11,6,32,0.78)';
    roundRect(ctx, width / 2 - 300, 150, 600, 330, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, width / 2 - 300, 150, 600, 330, 18);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    // Long titles (the victory line) shrink so they stay inside the panel.
    ctx.font = title.length > 14 ? 'bold 36px system-ui, sans-serif' : 'bold 52px system-ui, sans-serif';
    ctx.fillText(title, width / 2, 178);
    ctx.fillStyle = PALETTE.white;
    ctx.font = '18px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, 258 + i * 30);
    });
    ctx.restore();
  }

  function draw(state, screen, best) {
    const time = state.time;
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state, time);
    for (const pickup of state.pickups) {
      ctx.save();
      ctx.translate(pickup.x, pickup.y + Math.sin(pickup.t * 3) * 3);
      ctx.shadowColor = pickup.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = pickup.color;
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // One unmistakable mark per pickup kind: spread is three dots, shield
      // a ring, life a heart, bomb a star.
      ctx.fillStyle = '#0b0620';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (pickup.kind === 'spread') {
        ctx.beginPath();
        ctx.arc(-4, 3, 2.2, 0, Math.PI * 2);
        ctx.arc(4, 3, 2.2, 0, Math.PI * 2);
        ctx.arc(0, -4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pickup.kind === 'shield') {
        ctx.strokeStyle = '#0b0620';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pickup.kind === 'life') {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('♥', 0, 1);
      } else {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('✹', 0, 1);
      }
      ctx.restore();
    }
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    for (const bullet of state.bullets) {
      ctx.save();
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const bullet of state.enemyBullets) {
      ctx.save();
      ctx.shadowColor = PALETTE.magenta;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (screen !== SCREEN_OVER && screen !== SCREEN_WIN) drawPlayer(state.player, time);
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    drawHud(state, screen, best);
    if (screen === SCREEN_TITLE) {
      drawCenterPanel('EMBERLINE', [
        'Defend the Ember Line. Survive 10 waves.',
        'Move: arrows / WASD / mouse — Shoot: hold Space or mouse',
        'Bomb: B — Pause: P — Mute: M — Restart: R',
        'Catch pickups: SPREAD · SHIELD · +1 LIFE · BOMB',
        'Beat the Hollow Maw on wave 10 to win.',
      ], PALETTE.ember);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press Enter or click to play', width / 2, 500);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px system-ui, sans-serif';
      if (best > 0) ctx.fillText(`Best score: ${best}`, width / 2, 532);
      ctx.restore();
    } else if (screen === SCREEN_PAUSED) {
      drawCenterPanel('PAUSED', ['Take a breath, keeper.', 'Press P or Enter to continue — R to restart.'], PALETTE.cyan);
    } else if (screen === SCREEN_OVER) {
      drawCenterPanel('THE LINE FALLS', [
        `Score ${state.score}   ·   Best ${best}`,
        `Waves cleared: ${state.wave - 1} of ${FINAL_WAVE}   ·   Shards down: ${state.kills}`,
        'Press Enter or R to fly again.',
      ], PALETTE.magenta);
    } else if (screen === SCREEN_WIN) {
      drawCenterPanel('THE LINE BURNS BRIGHT', [
        `Score ${state.score}   ·   Best ${best}`,
        'The Hollow Maw is gone. Ten waves, one keeper.',
        'Press Enter or R to play again.',
      ], '#80ed99');
    }
    ctx.restore();
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN };
}
