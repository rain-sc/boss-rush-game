import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Application, Assets, Container, Graphics, Text, TilingSprite } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, POTION_HEAL } from './config'
import { initKeyboard, consumePotion } from './input'
import { CombatScene } from './combat/CombatScene'
import { emptyBuild, draftThree, type SkillCard } from './build'
import { getLevelConfig, TOTAL_LEVELS } from './levels'
import { playerSpritePath } from './player'
import { playSfx } from './sound'
import { loadRun, saveRun, getLoadoutStats, getInventory, useItem } from '../api'

type Phase = 'loading' | 'combat' | 'draft' | 'won' | 'lost'
const MAP_ID = 1

export default function CanvasStage({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [level, setLevel] = useState(1)
  const [cards, setCards] = useState<SkillCard[]>([])
  const [potions, setPotions] = useState(0)
  const pickRef = useRef<(c: SkillCard) => void>(() => {})
  const restartRef = useRef<() => void>(() => {})

  useEffect(() => {
    let app: Application | null = null
    let destroyed = false
    let detachLayout: (() => void) | null = null
    const detachKeys = initKeyboard()

    const phaseRef = { current: 'loading' as Phase }
    const levelRef = { current: 1 }
    let buildRef = emptyBuild()

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

      const [
        playerTex,
        slimeTex,
        goblinTex,
        fireballTex,
        orcTex,
        gobChiefTex,
        bearTex,
        dragonTex,
        groundTex,
      ] = await Promise.all([
        Assets.load(playerSpritePath()),
        Assets.load('/assets/enemies/slime/idle.png'),
        Assets.load('/assets/enemies/goblin/idle.png'),
        Assets.load('/assets/skills/projectiles/fireball.png'),
        Assets.load('/assets/bosses/orc_warlord/idle.png'),
        Assets.load('/assets/bosses/goblin_chieftain/idle.png'),
        Assets.load('/assets/bosses/dire_bear/idle.png'),
        Assets.load('/assets/bosses/forest_dragon/idle.png'),
        Assets.load('/assets/tiles/battle/forest_ground.png'),
      ])
      for (const t of [playerTex, slimeTex, goblinTex, fireballTex, orcTex, gobChiefTex, bearTex, dragonTex, groundTex])
        t.source.scaleMode = 'nearest'

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
          setCards(draftThree())
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

      const pickCard = (c: SkillCard) => {
        playSfx('click')
        buildRef = { ...buildRef, [c.id]: buildRef[c.id] + 1 }
        beginLevel(levelRef.current + 1, false)
        saveCurrent('PLAYING')
      }

      const restartRun = () => {
        buildRef = emptyBuild()
        beginLevel(1, true)
        saveCurrent('PLAYING')
      }

      pickRef.current = pickCard
      restartRef.current = restartRun

      scene = new CombatScene({
        world,
        textures: {
          player: playerTex,
          enemies: [slimeTex, goblinTex],
          fireball: fireballTex,
          bosses: { 5: orcTex, 10: gobChiefTex, 15: bearTex, 20: dragonTex },
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
          buildRef = { ...emptyBuild(), ...JSON.parse(saved.build) }
        } catch {
          buildRef = emptyBuild()
        }
        beginLevel(saved.currentLevel, true)
      } else {
        buildRef = emptyBuild()
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
                  className="ui-btn"
                  style={{ width: 150, padding: '14px 12px', textAlign: 'center' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 4 }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{c.desc}</div>
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
