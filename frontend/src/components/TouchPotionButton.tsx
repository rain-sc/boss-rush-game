import { requestPotion } from '../game/input'

/** Touch-only potion button (right side, above dodge). Desktop uses the Q key. */
export default function TouchPotionButton() {
  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (!isTouch) return null

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        requestPotion()
      }}
      style={{
        position: 'fixed',
        right: 36,
        bottom: 140,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(231,76,60,0.25)',
        border: '2px solid rgba(255,255,255,0.35)',
        color: '#fff',
        fontSize: 13,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      🧪藥水
    </button>
  )
}
