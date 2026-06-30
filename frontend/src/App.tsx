import { useEffect, useState, type CSSProperties } from 'react'
import CanvasStage from './game/CanvasStage'
import HubStage from './game/HubStage'
import TouchJoystick from './components/TouchJoystick'
import TouchDodgeButton from './components/TouchDodgeButton'
import TouchInteractButton from './components/TouchInteractButton'
import TouchPotionButton from './components/TouchPotionButton'
import FullscreenButton from './components/FullscreenButton'
import InventoryPanel from './components/InventoryPanel'
import FarmPanel from './components/FarmPanel'
import HousePanel from './components/HousePanel'
import CharacterSelect from './components/CharacterSelect'
import { getGender, type Gender } from './game/player'
import { getInventory, addItem, type InvItem } from './api'

type Screen = 'hub' | 'run'

const GATHER_LABEL: Record<string, string> = {
  tree: '木材',
  rock: '礦石',
  pond: '魚',
}

function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [near, setNear] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showInv, setShowInv] = useState(false)
  const [showFarm, setShowFarm] = useState(false)
  const [showHouse, setShowHouse] = useState(false)
  const [inv, setInv] = useState<InvItem[]>([])
  const [gender, setGenderState] = useState<Gender | null>(getGender())

  const refreshInv = () => getInventory().then(setInv)
  useEffect(() => {
    refreshInv()
  }, [])

  if (!gender) {
    return <CharacterSelect onDone={() => setGenderState(getGender())} />
  }

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1500)
  }

  const handleHubAction = async (id: string) => {
    if (id === 'portal') {
      setScreen('run')
      return
    }
    if (id === 'farm') {
      setShowFarm(true)
      return
    }
    if (id === 'house') {
      setShowHouse(true)
      return
    }
    if (id === 'tree' || id === 'rock' || id === 'pond') {
      const item = id === 'tree' ? 'wood' : id === 'rock' ? 'ore' : 'fish'
      await addItem(item, 1)
      await refreshInv()
      flash(`獲得 ${GATHER_LABEL[id]} ×1`)
    }
  }

  return (
    <>
      {screen === 'hub' ? (
        <HubStage onAction={handleHubAction} onNear={setNear} />
      ) : (
        <CanvasStage
          onExit={() => {
            setScreen('hub')
            refreshInv()
          }}
        />
      )}

      <TouchJoystick />
      {screen === 'run' && <TouchDodgeButton />}
      {screen === 'run' && <TouchPotionButton />}
      {screen === 'hub' && <TouchInteractButton />}
      <FullscreenButton />

      {/* top bar */}
      <div style={topHint}>
        {screen === 'hub'
          ? 'Phase 5 — 家園:移動 WASD/搖桿,設施按 E/互動(工坊可合成/裝備)'
          : 'Phase 5 — 戰鬥:移動 WASD/搖桿,閃避 空白鍵,藥水 Q'}
      </div>

      {screen === 'hub' && (
        <button style={invBtn} onClick={() => setShowInv(true)}>
          背包
        </button>
      )}

      {/* interaction prompt */}
      {screen === 'hub' && near && <div style={prompt}>{near}</div>}

      {/* toast */}
      {toast && <div style={toastStyle}>{toast}</div>}

      {showInv && <InventoryPanel items={inv} onClose={() => setShowInv(false)} />}
      {showFarm && (
        <FarmPanel
          onClose={() => setShowFarm(false)}
          onChanged={() => {
            refreshInv()
            flash('收成!')
          }}
        />
      )}
      {showHouse && <HousePanel items={inv} onClose={() => setShowHouse(false)} onChanged={refreshInv} />}

      <div className="rotate-notice">🔄 請將手機旋轉為橫向以獲得最佳體驗</div>
    </>
  )
}

const topHint: CSSProperties = {
  position: 'fixed',
  top: 8,
  left: 0,
  right: 0,
  textAlign: 'center',
  color: 'rgba(255,255,255,0.65)',
  font: '12px Zpix, sans-serif',
  pointerEvents: 'none',
}
const invBtn: CSSProperties = {
  position: 'fixed',
  top: 8,
  right: 56,
  zIndex: 12,
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  cursor: 'pointer',
}
const prompt: CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: 0,
  right: 0,
  textAlign: 'center',
  color: '#fff',
  font: '14px Zpix, sans-serif',
  textShadow: '0 1px 3px #000',
  pointerEvents: 'none',
}
const toastStyle: CSSProperties = {
  position: 'fixed',
  top: 64,
  left: 0,
  right: 0,
  textAlign: 'center',
  color: '#fff',
  font: '600 14px Zpix, sans-serif',
  textShadow: '0 1px 3px #000',
  pointerEvents: 'none',
}

export default App
