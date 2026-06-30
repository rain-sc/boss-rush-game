// Tiny WebAudio SFX — synthesized, no audio files. The AudioContext unlocks on
// the first user gesture (character select / button taps).

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime)
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, c.currentTime + dur)
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur)
}

export type Sfx = 'shoot' | 'hit' | 'hurt' | 'clear' | 'lose' | 'potion' | 'click'

export function playSfx(s: Sfx): void {
  switch (s) {
    case 'shoot':
      blip(660, 0.08, 'square', 0.025, 440)
      break
    case 'hit':
      blip(240, 0.05, 'square', 0.03)
      break
    case 'hurt':
      blip(180, 0.14, 'sawtooth', 0.045, 90)
      break
    case 'clear':
      blip(523, 0.12, 'square', 0.045)
      window.setTimeout(() => blip(784, 0.16, 'square', 0.045), 120)
      break
    case 'lose':
      blip(200, 0.3, 'sawtooth', 0.05, 80)
      break
    case 'potion':
      blip(880, 0.1, 'sine', 0.05, 1320)
      break
    case 'click':
      blip(440, 0.04, 'square', 0.03)
      break
  }
}
