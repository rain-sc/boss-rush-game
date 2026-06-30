import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Application, Assets, Container, Graphics, Text, TilingSprite, type Texture } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, POTION_HEAL } from './config'
import { initKeyboard, consumePotion } from './input'
import { CombatScene } from './combat/CombatScene'
import { starterBuild, draftThree, type DraftCard } from './skills'
import { getLevelConfig, TOTAL_LEVELS } from './levels'
import { playerBasePath } from './player'
import { loadFrames, WALK_FRAMES, MOVE_FRAMES } from './anims'
import { playSfx } from './sound'
import { loadRun, saveRun, getLoadoutStats, getInventory, useItem } from '../api'

type Phase = 'loading' | 'combat' | 'draft' | 'won' | 'lost'
const MAP_ID = 1

export default function CanvasStage({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [level, setLevel] = useState(1)
  const [cards, setCards] = useState<DraftCard[]>([])
  const [potions, setPotions] = useState(0)
  const pickRef = useRef<(c: DraftCard) => void>(() => {})
  const restartRef = useRef<() => void>(() => {})

  useEffect(() => {
    let app: Application | null = null
    let destroyed = false
    let detachLayout: (() => void) | null = null
    const detachKeys = initKeyboard()

    const phaseRef = { current: 'loading' as Phase }
    const levelRef = { current: 1 }
    let buildRef = starterBuild()

    ;(async () => {
      const pixi = new Application()
      await pixi.init({ background: '#000000', resizeTo: window, antialias: false })
      if (destroyed) {
        pixi.destroy(true)
        return
      }
      app = pixi
      hostRef.current?.appendChild(pixi.canvas)

      const world = new Container()
      pixi.stage.addChild(world)
      const bounds = { w: LOGICAL_W }

      const [playerWalk, slimeMove, goblinMove, orcMove, gobChiefMove, bearMove, dragonTex, groundTex] =
        await Promise.all([
          loadFrames(playerBasePath(), 'walk', WALK_FRAMES),
          loadFrames('/assets/enemies/slime', 'move', MOVE_FRAMES),
          loadFrames('/assets/enemies/goblin', 'move', MOVE_FRAMES),
          loadFrames('/assets/bosses/orc_warlord', 'move', MOVE_FRAMES),
          loadFrames('/assets/bosses/goblin_chieftain', 'move', MOVE_FRAMES),
          loadFrames('/assets/bosses/dire_bear', 'move', MOVE_FRAMES),
          Assets.load('/assets/bosses/forest_dragon/idle.png'), // dragon: static
          Assets.load('/assets/tiles/battle/forest_ground.png'),
        ])
      for (const t of [dragonTex, groundTex]) t.source.scaleMode = 'nearest'

      // Active-skill projectile/effect sprites.
      const skillProjectiles: Record<string, Texture> = {}
      await Promise.all(
        ['fireball', 'ice_shard', 'chain_lightning', 'wind_blade', 'rock_fall', 'poison_cloud', 'spin_slash'].map(
          async (id) => {
            const t = await Assets.load(`/assets/skills/projectiles/${id}.png`)
            t.source.scaleMode = 'nearest'
            skillProjectiles[id] = t
          },
        ),
      )

      // Tiled forest ground fills the (dynamic-width) field.
      const ground = new TilingSprite({ texture: groundTex, width: LOGICAL_W, height: LOGICAL_H })
      world.addChild(ground)

      const layout = () => {
        const scale = pixi.screen.height / LOGICAL_H
        world.scale.set(scale)
        world.position.set(0, 0)
        bounds.w = Math.ceil(pixi.screen.width / scale)
        ground.width = bounds.w
      }
      layout()
      const onOrient = () => window.setTimeout(layout, 200)
      window.addEventListener('resize', layout)
      window.addEventListener('orientationchange', onOrient)
      detachLayout = () => {
        window.removeEventListener('resize', layout)
        window.removeEventListener('orientationchange', onOrient)
      }

      let scene: CombatScene

      const saveCurrent = (status: string) =>
        saveRun({
          mapId: MAP_ID,
          currentLevel: levelRef.current,
          hp: Math.ceil(scene.playerHp),
          status,
          build: JSON.stringify(buildRef),
        })

      const beginLevel = (lvl: number, fullHeal: boolean) => {
        levelRef.current = lvl
        setLevel(lvl)
        scene.startLevel(getLevelConfig(lvl), buildRef, fullHeal)
        phaseRef.current = 'combat'
        setPhase('combat')
      }

      const handleCleared = () => {
        if (levelRef.current >= TOTAL_LEVELS) {
          phaseRef.current = 'won'
          setPhase('won')
          saveCurrent('WON')
        } else {
          setCards(draftThree(buildRef))
          phaseRef.current = 'draft'
          setPhase('draft')
          saveCurrent('PLAYING')
        }
      }

      const handleDied = () => {
        phaseRef.current = 'lost'
        setPhase('lost')
        saveCurrent('LOST')
      }

      const pickCard = (c: DraftCard) => {
        playSfx('click')
        buildRef = { ...buildRef, [c.id]: (buildRef[c.id] ?? 0) + 1 }
        beginLevel(levelRef.current + 1, false)
        saveCurrent('PLAYING')
      }

      const restartRun = () => {
        buildRef = starterBuild()
        beginLevel(1, true)
        saveCurrent('PLAYING')
      }

      pickRef.current = pickCard
      restartRef.current = restartRun

      scene = new CombatScene({
        world,
        textures: {
          playerWalk,
          enemies: [slimeMove, goblinMove],
          skillProjectiles,
          bosses: { 5: orcMove, 10: gobChiefMove, 15: bearMove, 20: [dragonTex] },
        },
        getW: () => bounds.w,
        onCleared: handleCleared,
        onDied: handleDied,
      })

      // HUD (screen space)
      const hud = new Container()
      pixi.stage.addChild(hud)
      const hpBg = new Graphics()
      const hpFill = new Graphics()
      const info = new Text({ text: '', style: { fill: 0xffffff, fontSize: 13, fontFamily: 'Zpix, sans-serif' } })
      hud.addChild(hpBg, hpFill, info)
      const drawHud = () => {
        const x = 12
        const y = 12
        const w = 180
        const h = 16
        hpBg.clear()
        hpBg.roundRect(x, y, w, h, 3).fill({ color: 0x000000, alpha: 0.5 })
        const frac = Math.max(0, scene.playerHp / scene.playerMaxHp)
        hpFill.clear()
        if (frac > 0) hpFill.roundRect(x + 2, y + 2, (w - 4) * frac, h - 4, 2).fill(0xe74c3c)
        info.position.set(x, y + h + 4)
        const lvl = levelRef.current
        const boss = lvl % 5 === 0
        info.text = `HP ${Math.ceil(scene.playerHp)}/${scene.playerMaxHp}    關卡 ${lvl}/${TOTAL_LEVELS}${boss ? ' (BOSS)' : ''}    敵人 ${scene.enemyCount}`
      }

      // Equipment stats (aggregated by backend) + potion count.
      const refreshPotions = async () => {
        const inv = await getInventory()
        setPotions(inv.find((i) => i.itemId === 'potion_small')?.qty ?? 0)
      }
      const usePotion = () => {
        if (phaseRef.current !== 'combat') return
        useItem('potion_small').then((res) => {
          if (res.ok) {
            scene.healPlayer(POTION_HEAL)
            refreshPotions()
          }
        })
      }
      const stats = await getLoadoutStats()
      scene.setEquip(stats.attack, stats.maxHp)
      refreshPotions()

      pixi.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05)
        const wantPotion = consumePotion()
        if (phaseRef.current === 'combat') {
          if (wantPotion) usePotion()
          scene.update(dt)
        }
        drawHud()
      })

      // resume saved run or start fresh
      const saved = await loadRun()
      if (saved && saved.status === 'PLAYING' && saved.currentLevel >= 1 && saved.currentLevel <= TOTAL_LEVELS) {
        try {
          buildRef = { ...starterBuild(), ...JSON.parse(saved.build) }
        } catch {
          buildRef = starterBuild()
        }
        beginLevel(saved.currentLevel, true)
      } else {
        buildRef = starterBuild()
        beginLevel(1, true)
      }
    })()

    return () => {
      destroyed = true
      detachKeys()
      detachLayout?.()
      app?.destroy(true, { children: true })
    }
  }, [])

  return (
    <div ref={hostRef}>
      {phase === 'combat' && <div style={potionBadge}>🧪 藥水 ×{potions}(Q)</div>}

      {phase === 'draft' && (
        <div style={overlay}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontFamily: 'Zpix, sans-serif' }}>選擇一項強化(第 {level} 關通過)</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {cards.map((c, i) => (
                <button
                  key={i}
                  onClick={() => pickRef.current(c)}
                  className="ui-card"
                  style={{ width: 150, padding: '10px', textAlign: 'center' }}
                >
                  <img src={c.icon} alt="" width={40} height={40} style={{ imageRendering: 'pixelated', marginBottom: 4 }} />
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#2e7d32', marginBottom: 4 }}>
                    {c.isNew ? '新技能' : `Lv ${c.level - 1}→${c.level}`}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{c.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div style={overlay}>
          <div style={{ textAlign: 'center', fontFamily: 'Zpix, sans-serif' }}>
            <h2 style={{ color: phase === 'won' ? '#2ecc71' : '#e74c3c', fontSize: 40, margin: 0 }}>
              {phase === 'won' ? '通關!' : '你死了'}
            </h2>
            <div style={{ color: '#fff', marginTop: 8 }}>
              {phase === 'won' ? '恭喜打完地圖 1 全 20 關' : `止步於第 ${level} 關`}
            </div>
            <div>
              <button onClick={() => restartRef.current()} style={btn}>
                重新挑戰
              </button>
              {onExit && (
                <button onClick={onExit} style={{ ...btn, marginLeft: 12, background: '#ddd' }}>
                  回家園
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
}
const btn: CSSProperties = {
  marginTop: 16,
  padding: '10px 22px',
  fontSize: 16,
  borderRadius: 8,
  border: 'none',
  background: '#fff',
  cursor: 'pointer',
}
const potionBadge: CSSProperties = {
  position: 'fixed',
  top: 52,
  left: 12,
  zIndex: 12,
  color: '#fff',
  font: '600 13px Zpix, sans-serif',
  textShadow: '0 1px 3px #000',
  pointerEvents: 'none',
}
