export type Gender = 'male' | 'female'

const KEY = 'playerGender'

export function getGender(): Gender | null {
  const v = localStorage.getItem(KEY)
  return v === 'male' || v === 'female' ? v : null
}

export function setGender(g: Gender): void {
  localStorage.setItem(KEY, g)
}

/** Path to the chosen character's idle sprite (defaults to male). */
export function playerSpritePath(): string {
  return `${playerBasePath()}/idle.png`
}

/** Folder for the chosen character's sprites (idle.png, walk_*.png). */
export function playerBasePath(): string {
  return `/assets/characters/player/${getGender() ?? 'male'}`
}
