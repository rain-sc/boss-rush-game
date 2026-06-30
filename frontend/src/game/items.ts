export const ITEM_NAMES: Record<string, string> = {
  wood: '木材',
  ore: '礦石',
  herb: '草藥',
  fish: '魚',
  carrot: '蘿蔔',
}

export const itemName = (id: string): string => ITEM_NAMES[id] ?? id
