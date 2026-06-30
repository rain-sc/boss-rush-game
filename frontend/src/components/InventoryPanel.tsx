import type { CSSProperties } from 'react'
import type { InvItem } from '../api'
import { itemName } from '../game/items'

export default function InventoryPanel({ items, onClose }: { items: InvItem[]; onClose: () => void }) {
  return (
    <div style={overlay}>
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>背包 / 倉庫</h3>
        {items.length === 0 ? (
          <p style={{ opacity: 0.7 }}>還沒有任何材料,去家園採集 / 耕種 / 釣魚吧。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((it) => (
              <li key={it.itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img
                    src={`/assets/items/${it.itemId}.png`}
                    alt=""
                    width={22}
                    height={22}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {itemName(it.itemId)}
                </span>
                <span style={{ fontWeight: 700 }}>×{it.qty}</span>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} style={btn}>
          關閉
        </button>
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
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'sans-serif',
}
const panel: CSSProperties = {
  width: 280,
  maxWidth: '90vw',
  background: '#fff',
  borderRadius: 12,
  padding: 18,
}
const btn: CSSProperties = {
  marginTop: 14,
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: '#eee',
  cursor: 'pointer',
}
