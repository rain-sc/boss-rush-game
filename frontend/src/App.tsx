import CanvasStage from './game/CanvasStage'
import TouchJoystick from './components/TouchJoystick'

function App() {
  return (
    <>
      <CanvasStage />
      <TouchJoystick />
      <div
        style={{
          position: 'fixed',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          font: '12px sans-serif',
          pointerEvents: 'none',
        }}
      >
        Phase 1 — WASD / 方向鍵 或 左下搖桿 移動
      </div>
    </>
  )
}

export default App
