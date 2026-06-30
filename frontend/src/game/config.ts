// Logical (internal) resolution — the whole scene renders at this size and is
// scaled up by an integer factor with letterboxing (see docs/assets.md §8).
export const LOGICAL_W = 480
export const LOGICAL_H = 270

// Player movement speed in logical pixels per second.
export const PLAYER_SPEED = 90

// Player sprite display size in logical pixels.
export const PLAYER_SIZE = 32

// --- Phase 2 combat tuning (logical units; seconds) ---
export const PLAYER_MAX_HP = 100
export const PLAYER_HIT_RADIUS = 10

// Dodge: brief dash with invulnerability frames.
export const DODGE_SPEED = 260
export const DODGE_TIME = 0.25
export const DODGE_CD = 0.9

// Auto-cast skill (fireball): fires at nearest enemy on cooldown.
export const FIREBALL_CD = 0.9
export const FIREBALL_SPEED = 170
export const FIREBALL_DAMAGE = 12
export const FIREBALL_RADIUS = 5

// Enemy.
export const ENEMY_SPEED = 38
export const ENEMY_HP = 30
export const ENEMY_RADIUS = 10
export const ENEMY_SIZE = 26 // sprite display size (visual; hitbox uses ENEMY_RADIUS)
export const FIREBALL_SIZE = 16 // sprite display size
export const ENEMY_TOUCH_DAMAGE = 8
export const ENEMY_TOUCH_INTERVAL = 0.8

// One wave clears the level.
export const WAVE_COUNT = 6
