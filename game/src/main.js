// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|boss|victory|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createWorld, EVENT_OVER, EVENT_WIN } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Staging keeps the pilot invulnerable; clear it so the ship is drawn
  // instead of caught mid-blink.
  world.state.player.invulnerable = 0;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.beginWave(1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Three lives. Defend the Ember Line.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.victory();
    else audio.gameOver();
    announce(won ? `Victory! Score ${world.state.score}. Best ${best}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const read = input.read();
    if (read.actions.has(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (read.actions.has(ACTION_CONFIRM)) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (read.actions.has(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = world.step(STEP, read, audio);
          if (events & EVENT_WIN) {
            endGame(true);
            break;
          }
          if (events & EVENT_OVER) {
            endGame(false);
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (read.actions.has(ACTION_PAUSE) || read.actions.has(ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        last = performance.now();
        announce('Playing.');
      } else if (read.actions.has(ACTION_RESTART)) {
        startGame();
      }
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (read.actions.has(ACTION_CONFIRM) || read.actions.has(ACTION_RESTART)) startGame();
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  announce('Emberline. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
