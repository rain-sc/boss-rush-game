import type { CSSProperties } from 'react'
import { setGender, type Gender } from '../game/player'
import { playSfx } from '../game/sound'

/** First-run character choice (cosmetic male/female). */
export default function CharacterSelect({ onDone }: { onDone: () => void }) {
  const choose = (g: Gender) => {
    playSfx('click')
    setGender(g)
    onDone()
  }
  return (
    <div style={overlay}>
      <h2 style={{ color: '#fff', fontFamily: 'Zpix, sans-serif', marginBottom: 20 }}>選擇角色</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        {(['male', 'female'] as Gender[]).map((g) => (
          <button key={g} onClick={() => choose(g)} style={card}>
            <img
              src={`/assets/characters/player/${g}/idle.png`}
              alt={g}
              width={96}
              height={96}
              style={{ imageRendering: 'pixelated' }}
            />
            <div style={{ marginTop: 8, fontWeight: 700 }}>{g === 'male' ? '男' : '女'}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#15171d',
}
const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '18px 26px',
  borderRadius: 12,
  border: 'none',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'Zpix, sans-serif',
}
