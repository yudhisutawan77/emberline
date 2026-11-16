// Keyboard and mouse, read the same way by the game and by the screenshot
// autopilot: the world only ever sees an action object.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';
export const ACTION_BOMB = 'bomb';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
  b: ACTION_BOMB,
  B: ACTION_BOMB,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, seen: false };
  let hadFocus = false;

  function onKeyDown(event) {
    if (event.key === ' ') event.preventDefault();
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    pressed.add(KEY_ACTIONS[event.key] ?? event.key);
    hadFocus = true;
  }
  function onKeyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    mouse.seen = true;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    pressed.add(ACTION_CONFIRM);
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // Read once per frame: the axes, whether to shoot, and the one-shot
    // actions pressed since the last read.
    read() {
      const left = keys.has('arrowleft') || keys.has('a');
      const right = keys.has('arrowright') || keys.has('d');
      const up = keys.has('arrowup') || keys.has('w');
      const down = keys.has('arrowdown') || keys.has('s');
      const shooting = keys.has(' ') || keys.has('z') || mouse.down;
      const actions = new Set(pressed);
      pressed.clear();
      return {
        x: (right ? 1 : 0) - (left ? 1 : 0),
        y: (down ? 1 : 0) - (up ? 1 : 0),
        shooting,
        mouse,
        actions,
        hadFocus,
      };
    },
    hasAction(actions, name) {
      return actions.has(name);
    },
  };
}
