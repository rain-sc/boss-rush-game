import { useEffect, useState } from 'react'

/** Toggle fullscreen; tries to lock landscape on mobile when supported. */
export default function FullscreenButton() {
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Desktop fills the window already — only show on touch devices.
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (!isTouch) return null

  const toggle = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        const orientation = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation
        if (orientation?.lock) {
          try {
            await orientation.lock('landscape')
          } catch {
            /* lock not allowed on this device */
          }
        }
      } else {
        await document.exitFullscreen()
      }
    } catch {
      /* Fullscreen API not supported (e.g. iOS Safari) */
    }
  }

  return (
    <button
      onClick={toggle}
      title="全螢幕"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 20,
        width: 40,
        height: 40,
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.3)',
        background: 'rgba(0,0,0,0.4)',
        color: '#fff',
        fontSize: 18,
        cursor: 'pointer',
      }}
    >
      {isFull ? '🗗' : '⛶'}
    </button>
  )
}
