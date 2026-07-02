export type MapDef = {
  id: number
  name: string
  theme: string
  ground: string // full 16:9 battle-ground image, stretched to fill
  difficulty: number // enemy HP multiplier
  available: boolean
}

export const MAPS: MapDef[] = [
  { id: 1, name: '翠綠林地', theme: '森林', ground: '/assets/tiles/battle/map1.png', difficulty: 1, available: true },
  { id: 2, name: '幽暗洞窟', theme: '洞窟', ground: '/assets/tiles/battle/map2.png', difficulty: 1.6, available: true },
  { id: 3, name: '灼熱沙漠', theme: '沙漠', ground: '/assets/tiles/battle/map3.png', difficulty: 2.2, available: true },
  { id: 4, name: '迷霧沼澤', theme: '毒沼', ground: '/assets/tiles/battle/map4.png', difficulty: 2.8, available: true },
  { id: 5, name: '凜冬雪原', theme: '冰雪', ground: '/assets/tiles/battle/map5.png', difficulty: 3.4, available: true },
  { id: 6, name: '古代遺跡', theme: '遺跡', ground: '/assets/tiles/battle/map6.png', difficulty: 4.0, available: true },
  { id: 7, name: '熔岩火山', theme: '火山', ground: '/assets/tiles/battle/map7.png', difficulty: 4.6, available: true },
  { id: 8, name: '雷鳴高塔', theme: '高塔', ground: '/assets/tiles/battle/map8.png', difficulty: 5.2, available: true },
  { id: 9, name: '腐朽墓園', theme: '不死', ground: '/assets/tiles/battle/map9.png', difficulty: 5.8, available: true },
  { id: 10, name: '虛空深淵', theme: '終章', ground: '/assets/tiles/battle/map10.png', difficulty: 6.5, available: true },
]

export const getMap = (id: number): MapDef => MAPS.find((m) => m.id === id) ?? MAPS[0]
