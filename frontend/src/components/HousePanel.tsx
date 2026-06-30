import { useEffect, useState, type CSSProperties } from 'react'
import {
  getRecipes,
  craft,
  getEquipment,
  equipItem,
  enhanceItem,
  getLoadoutStats,
  type Recipe,
  type EquipView,
  type LoadoutStats,
  type InvItem,
} from '../api'
import { itemName } from '../game/items'
import { playSfx } from '../game/sound'

export default function HousePanel({
  items,
  onClose,
  onChanged,
}: {
  items: InvItem[]
  onClose: () => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'craft' | 'gear'>('craft')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [gear, setGear] = useState<EquipView[]>([])
  const [stats, setStats] = useState<LoadoutStats>({ attack: 0, maxHp: 0 })

  const qtyOf = (id: string) => items.find((i) => i.itemId === id)?.qty ?? 0
  const canAfford = (cost: Record<string, number>) => Object.entries(cost).every(([id, q]) => qtyOf(id) >= q)
  const costText = (cost: Record<string, number>) =>
    Object.entries(cost)
      .map(([id, q]) => `${itemName(id)}×${q}`)
      .join('、')

  const reloadGear = async () => {
    setGear(await getEquipment())
    setStats(await getLoadoutStats())
  }

  useEffect(() => {
    getRecipes().then(setRecipes)
    reloadGear()
  }, [])

  const doCraft = async (id: string) => {
    playSfx('click')
    const res = await craft(id)
    if (res.ok) {
      onChanged()
      reloadGear()
    }
  }
  const doEquip = async (instanceId: number) => {
    setGear(await equipItem(instanceId))
    setStats(await getLoadoutStats())
  }
  const doEnhance = async (instanceId: number) => {
    const res = await enhanceItem(instanceId)
    if (res.ok) {
      onChanged()
      reloadGear()
    }
  }

  return (
    <div style={overlay}>
      <div className="ui-panel" style={panel}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button style={tabBtn(tab === 'craft')} onClick={() => setTab('craft')}>
            合成
          </button>
          <button style={tabBtn(tab === 'gear')} onClick={() => setTab('gear')}>
            裝備
          </button>
          <div style={{ flex: 1 }} />
          <button style={closeBtn} onClick={onClose}>
            關閉
          </button>
        </div>

        {tab === 'craft' && (
          <ul style={list}>
            {recipes.map((r) => {
              const ok = canAfford(r.cost)
              return (
                <li key={r.id} style={row}>
                  <img src={iconFor(r)} alt="" width={26} height={26} style={pixel} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{r.outputName}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{costText(r.cost)}</div>
                  </div>
                  <button style={actBtn(ok)} disabled={!ok} onClick={() => doCraft(r.id)}>
                    合成
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'gear' && (
          <>
            <div style={{ marginBottom: 8, fontSize: 13 }}>
              裝備總屬性:攻擊 <b>+{stats.attack}</b>　生命 <b>+{stats.maxHp}</b>
            </div>
            {gear.length === 0 ? (
              <p style={{ opacity: 0.7 }}>還沒有裝備,去「合成」做一把吧。</p>
            ) : (
              <ul style={list}>
                {gear.map((g) => (
                  <li key={g.instanceId} style={row}>
                    <img src={`/assets/equipment/${g.defId}.png`} alt="" width={26} height={26} style={pixel} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>
                        {g.name} +{g.enhanceLevel} {g.equipped && <span style={{ color: '#2ecc71' }}>(已裝備)</span>}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {g.attack > 0 && `攻擊+${g.attack} `}
                        {g.maxHp > 0 && `生命+${g.maxHp} `}
                        ・強化:{costText(g.enhanceCost)}
                      </div>
                    </div>
                    {!g.equipped && (
                      <button style={actBtn(true)} onClick={() => doEquip(g.instanceId)}>
                        裝備
                      </button>
                    )}
                    <button
                      style={{ ...actBtn(canAfford(g.enhanceCost)), marginLeft: 6 }}
                      disabled={!canAfford(g.enhanceCost)}
                      onClick={() => doEnhance(g.instanceId)}
                    >
                      強化
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const iconFor = (r: Recipe) =>
  r.type === 'EQUIPMENT' ? `/assets/equipment/${r.output}.png` : `/assets/items/${r.output}.png`

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'Zpix, sans-serif',
}
const panel: CSSProperties = { width: 360, maxWidth: '94vw', background: '#fff', borderRadius: 12, padding: 16 }
const list: CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: '#f6f4ef', borderRadius: 8, padding: 8 }
const pixel: CSSProperties = { imageRendering: 'pixelated' }
const tabBtn = (active: boolean): CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  background: active ? '#333' : '#eee',
  color: active ? '#fff' : '#333',
})
const closeBtn: CSSProperties = { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#eee', cursor: 'pointer' }
const actBtn = (enabled: boolean): CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  cursor: enabled ? 'pointer' : 'not-allowed',
  background: enabled ? '#d8c7a0' : '#ddd',
  opacity: enabled ? 1 : 0.6,
})
