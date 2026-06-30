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

// --- Phase 5: crafting, equipment, loadout ---

export type Recipe = { id: string; name: string; type: string; cost: Record<string, number>; output: string; outputName: string }
export type EquipView = {
  instanceId: number
  defId: string
  name: string
  slot: string
  enhanceLevel: number
  equipped: boolean
  attack: number
  maxHp: number
  enhanceCost: Record<string, number>
}
export type LoadoutStats = { attack: number; maxHp: number }

export async function getRecipes(): Promise<Recipe[]> {
  try {
    const r = await fetch('/api/craft/recipes')
    return r.ok ? ((await r.json()) as Recipe[]) : []
  } catch {
    return []
  }
}

export async function craft(recipeId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const r = await postJson('/api/craft', { recipeId })
    return r.ok ? await r.json() : { ok: false }
  } catch {
    return { ok: false }
  }
}

export async function getEquipment(): Promise<EquipView[]> {
  try {
    const r = await fetch('/api/equipment')
    return r.ok ? ((await r.json()) as EquipView[]) : []
  } catch {
    return []
  }
}

export async function equipItem(instanceId: number): Promise<EquipView[]> {
  try {
    const r = await postJson(`/api/equipment/${instanceId}/equip`, {})
    return r.ok ? ((await r.json()) as EquipView[]) : []
  } catch {
    return []
  }
}

export async function enhanceItem(instanceId: number): Promise<{ ok: boolean }> {
  try {
    const r = await postJson(`/api/equipment/${instanceId}/enhance`, {})
    return r.ok ? await r.json() : { ok: false }
  } catch {
    return { ok: false }
  }
}

export async function getLoadoutStats(): Promise<LoadoutStats> {
  try {
    const r = await fetch('/api/loadout/stats')
    return r.ok ? ((await r.json()) as LoadoutStats) : { attack: 0, maxHp: 0 }
  } catch {
    return { attack: 0, maxHp: 0 }
  }
}

export async function useItem(itemId: string): Promise<{ ok: boolean }> {
  try {
    const r = await postJson('/api/inventory/use', { itemId })
    return r.ok ? await r.json() : { ok: false }
  } catch {
    return { ok: false }
  }
}
