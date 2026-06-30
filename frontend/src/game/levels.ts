import { ENEMY_HP } from './config'

export const TOTAL_LEVELS = 20

export type LevelConfig = {
  level: number
  isBoss: boolean
  enemyCount: number
  enemyHp: number
}

/** Levels 5/10/15/20 are bosses; others are scaling waves of normal enemies. */
export function getLevelConfig(level: number): LevelConfig {
  const isBoss = level % 5 === 0
  if (isBoss) {
    return { level, isBoss: true, enemyCount: 1, enemyHp: 120 + level * 30 }
  }
  return { level, isBoss: false, enemyCount: 4 + Math.floor(level / 2), enemyHp: ENEMY_HP + level * 4 }
}
