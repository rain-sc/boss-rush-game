import { useEffect, useState, type CSSProperties } from 'react'
import { getPlots, plantPlot, harvestPlot, type Plot } from '../api'
import { itemName } from '../game/items'

const PLOT_COUNT = 4
const CROP = 'carrot'
const GROW_SECONDS = 30

export default function FarmPanel({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [plots, setPlots] = useState<Plot[]>([])
  const [now, setNow] = useState(Date.now())

  const refresh = async () => setPlots(await getPlots())

  useEffect(() => {
    refresh()
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const plant = async (i: number) => {
    await plantPlot(i, CROP, GROW_SECONDS)
    await refresh()
  }
  const harvest = async (i: number) => {
    const res = await harvestPlot(i)
    if (res.harvested) onChanged()
    await refresh()
  }

  const plotAt = (i: number) => plots.find((p) => p.plotIndex === i)

  return (
    <div style={overlay}>
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>農田(種 {itemName(CROP)},{GROW_SECONDS}s 成熟)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: PLOT_COUNT }, (_, i) => {
            const p = plotAt(i)
            const ready = p ? now >= new Date(p.readyAt).getTime() : false
            const remain = p ? Math.max(0, Math.ceil((new Date(p.readyAt).getTime() - now) / 1000)) : 0
            return (
              <div key={i} style={plot}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>地塊 {i + 1}</div>
                {!p && (
                  <button onClick={() => plant(i)} style={btn}>
                    🌱 播種
                  </button>
                )}
                {p && !ready && <div style={{ color: '#8a6d3b' }}>成長中… {remain}s</div>}
                {p && ready && (
                  <button onClick={() => harvest(i)} style={{ ...btn, background: '#2ecc71', color: '#fff' }}>
                    ✓ 收成
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={onClose} style={{ ...btn, marginTop: 14, background: '#eee' }}>
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
const panel: CSSProperties = { width: 320, maxWidth: '92vw', background: '#fff', borderRadius: 12, padding: 18 }
const plot: CSSProperties = {
  background: '#f3ede2',
  border: '1px solid #e0d6c2',
  borderRadius: 8,
  padding: 12,
  textAlign: 'center',
  minHeight: 70,
}
const btn: CSSProperties = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#d8c7a0', cursor: 'pointer' }
