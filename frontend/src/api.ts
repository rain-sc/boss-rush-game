// Best-effort run persistence. Failures (e.g. backend offline) are swallowed so
// the game stays playable without a backend during development.

export type RunData = {
  mapId: number
  currentLevel: number
  hp: number
  status: string
  build: string
}

export async function loadRun(): Promise<RunData | null> {
  try {
    const r = await fetch('/api/run')
    if (!r.ok) return null
    const text = await r.text()
    return text ? (JSON.parse(text) as RunData) : null
  } catch {
    return null
  }
}

export async function saveRun(data: RunData): Promise<void> {
  try {
    await fetch('/api/run/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    /* offline: ignore */
  }
}
