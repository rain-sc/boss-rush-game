// Unified movement input: keyboard (WASD / arrows) + virtual joystick.
// Both feed a single normalized direction read each game tick.

const keys = new Set<string>()

// Virtual joystick state (written by <TouchJoystick>), range [-1, 1].
export const touch = { x: 0, y: 0, active: false }

// One-shot dodge request (keyboard space or touch button), consumed per use.
let dodgeQueued = false
export function requestDodge(): void {
  dodgeQueued = true
}
export function consumeDodge(): boolean {
  const v = dodgeQueued
  dodgeQueued = false
  return v
}

// One-shot interact request (keyboard E or touch button), used in the hub.
let interactQueued = false
export function requestInteract(): void {
  interactQueued = true
}
export function consumeInteract(): boolean {
  const v = interactQueued
  interactQueued = false
  return v
}

export function initKeyboard(): () => void {
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === ' ' || k === 'spacebar') {
      requestDodge()
      e.preventDefault()
    }
    if (k === 'e') requestInteract()
    keys.add(k)
  }
  const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    keys.clear()
  }
}

function normalize(x: number, y: number): { x: number; y: number } {
  const m = Math.hypot(x, y)
  return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 }
}

/** Current movement direction (unit vector). Joystick takes priority. */
export function getDirection(): { x: number; y: number } {
  if (touch.active && (touch.x !== 0 || touch.y !== 0)) {
    return normalize(touch.x, touch.y)
  }
  let x = 0
  let y = 0
  if (keys.has('arrowleft') || keys.has('a')) x -= 1
  if (keys.has('arrowright') || keys.has('d')) x += 1
  if (keys.has('arrowup') || keys.has('w')) y -= 1
  if (keys.has('arrowdown') || keys.has('s')) y += 1
  return normalize(x, y)
}
