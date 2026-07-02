import type { CSSProperties } from 'react'
import { MAPS } from '../game/maps'

export default function MapSelect({
  highestCleared,
  onSelect,
  onClose,
}: {
  highestCleared: number
  onSelect: (id: number) => void
  onClose: () => void
}) {
  return (
    <div style={overlay}>
      <div className="ui-panel" style={panel}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>選擇地圖</h3>
        <div style={grid}>
          {MAPS.map((m) => {
            const cleared = m.id <= highestCleared
            const unlocked = m.available && m.id <= highestCleared + 1
            const tag = !m.available
              ? '敬請期待'
              : cleared
                ? '✅ 已通關'
                : unlocked
                  ? '▶ 可挑戰'
                  : '🔒 未解鎖'
            return (
              <button
                key={m.id}
                disabled={!unlocked}
                onClick={() => onSelect(m.id)}
                style={{ ...cell, opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'not-allowed' }}
              >
                <div style={{ fontWeight: 700 }}>
                  {m.id}. {m.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>
                  {m.theme}・{tag}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose} style={closeBtn}>
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
  fontFamily: 'Zpix, sans-serif',
}
const panel: CSSProperties = { width: 380, maxWidth: '94vw', background: '#fff', borderRadius: 12, padding: 18 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }
const cell: CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #e0d6c2',
  background: '#f6f4ef',
}
const closeBtn: CSSProperties = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#eee', cursor: 'pointer' }
