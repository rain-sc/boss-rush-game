import { Assets, type Texture } from 'pixi.js'

export const WALK_FRAMES = 4
export const MOVE_FRAMES = 4

/** Load `${base}/${anim}_0.png` .. `_(count-1).png` as nearest-sampled textures. */
export async function loadFrames(base: string, anim: string, count: number): Promise<Texture[]> {
  const frames = await Promise.all(
    Array.from({ length: count }, (_, i) => Assets.load(`${base}/${anim}_${i}.png`)),
  )
  frames.forEach((t) => {
    t.source.scaleMode = 'nearest'
  })
  return frames
}
