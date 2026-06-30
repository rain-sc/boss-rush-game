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

// --- Phase 4: inventory + farming ---

export type InvItem = { itemId: string; qty: number }
export type Plot = { plotIndex: number; cropItemId: string; plantedAt: string; readyAt: string }

const postJson = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export async function getInventory(): Promise<InvItem[]> {
  try {
    const r = await fetch('/api/inventory')
    return r.ok ? ((await r.json()) as InvItem[]) : []
  } catch {
    return []
  }
}

export async function addItem(itemId: string, qty = 1): Promise<void> {
  try {
    await postJson('/api/inventory/add', { itemId, qty })
  } catch {
    /* ignore */
  }
}

export async function getPlots(): Promise<Plot[]> {
  try {
    const r = await fetch('/api/farm')
    return r.ok ? ((await r.json()) as Plot[]) : []
  } catch {
    return []
  }
}

export async function plantPlot(plotIndex: number, cropItemId: string, growSeconds: number): Promise<void> {
  try {
    await postJson('/api/farm/plant', { plotIndex, cropItemId, growSeconds })
  } catch {
    /* ignore */
  }
}

export async function harvestPlot(plotIndex: number): Promise<{ harvested: boolean; item: string | null }> {
  try {
    const r = await postJson('/api/farm/harvest', { plotIndex })
    return r.ok ? await r.json() : { harvested: false, item: null }
  } catch {
    return { harvested: false, item: null }
  }
}
