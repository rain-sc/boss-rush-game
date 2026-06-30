import { requestInteract } from '../game/input'

/** Touch-only interact button (bottom-right). Desktop uses the E key. */
export default function TouchInteractButton() {
  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (!isTouch) return null

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        requestInteract()
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
      互動
    </button>
  )
}
