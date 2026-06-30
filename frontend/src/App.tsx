import { useEffect, useState } from 'react'

type Health = { status: string; db: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Health) => setHealth(data))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Boss Rush — Phase 0</h1>
      {!health && !error && <p>Checking backend…</p>}
      {error && <p style={{ color: 'crimson' }}>後端連線失敗:{error}</p>}
      {health && (
        <p style={{ color: 'seagreen', fontWeight: 600 }}>
          後端連線正常 — status: {health.status}, db: {health.db}
        </p>
      )}
    </main>
  )
}

export default App
