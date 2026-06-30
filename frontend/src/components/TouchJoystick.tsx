import { useEffect, useRef } from 'react'
import { touch, getDirection } from '../game/input'

const RADIUS = 50 // max knob travel in px

/**
 * On-screen virtual joystick (bottom-left). Writes a normalized vector into
 * the shared `touch` input state. Works with mouse too (handy for desktop test).
 */
export default function TouchJoystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const center = useRef({ x: 0, y: 0 })

  const update = (clientX: number, clientY: number) => {
    const dx = clientX - center.current.x
    const dy = clientY - center.current.y
    const mag = Math.hypot(dx, dy)
    const clamped = Math.min(mag, RADIUS)
    const nx = mag > 0 ? dx / mag : 0
    const ny = mag > 0 ? dy / mag : 0
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`
    }
    touch.x = nx * (clamped / RADIUS)
    touch.y = ny * (clamped / RADIUS)
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current!.getBoundingClientRect()
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    pointerId.current = e.pointerId
    touch.active = true
    baseRef.current!.setPointerCapture(e.pointerId)
    update(e.clientX, e.clientY)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return
    update(e.clientX, e.clientY)
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return
    pointerId.current = null
    touch.active = false
    touch.x = 0
    touch.y = 0
    if (knobRef.current) knobRef.current.style.transform = 'translate(0, 0)'
  }

  // When not dragging, mirror the keyboard (WASD/arrows) direction on the knob.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (pointerId.current === null && knobRef.current) {
        const d = getDirection()
        knobRef.current.style.transform = `translate(${d.x * RADIUS}px, ${d.y * RADIUS}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute',
          left: 35,
          top: 35,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
