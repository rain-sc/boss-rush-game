import CanvasStage from './game/CanvasStage'
import TouchJoystick from './components/TouchJoystick'
import TouchDodgeButton from './components/TouchDodgeButton'
import FullscreenButton from './components/FullscreenButton'

function App() {
  return (
    <>
      <CanvasStage />
      <TouchJoystick />
      <TouchDodgeButton />
      <FullscreenButton />
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
        Phase 2 — 移動:WASD / 搖桿　閃避:空白鍵 / 閃避鈕　技能自動施放
      </div>

      <div className="rotate-notice">🔄 請將手機旋轉為橫向以獲得最佳體驗</div>
    </>
  )
}

export default App
