import { requestDodge } from '../game/input'

/** Touch-only dodge button (bottom-right). Desktop uses the Space key. */
export default function TouchDodgeButton() {
  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (!isTouch) return null

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        requestDodge()
      }}
      style={{
        position: 'fixed',
        right: 28,
        bottom: 40,
        width: 84,
        height: 84,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.35)',
        color: '#fff',
        fontSize: 15,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      閃避
    </button>
  )
}
