import type { DishWithMatch, SortMode } from './types'
import { DIFFICULTIES } from './types'

const difficultyRank = (value: string) => {
  const index = DIFFICULTIES.indexOf(value as (typeof DIFFICULTIES)[number])
  return index === -1 ? 1 : index
}

/**
 * 四档排序，和参考图里的 tab 对齐。
 * 同分时按菜名稳定排序，避免每次渲染顺序乱跳。
 */
export function sortMatches(items: DishWithMatch[], mode: SortMode): DishWithMatch[] {
  const sorted = [...items]
  sorted.sort((a, b) => {
    switch (mode) {
      case 'pantry': {
        // 优先消耗：先排能用掉最多家里食材的菜
        const used = b.matched.length - a.matched.length
        if (used !== 0) return used
        if (b.coverage !== a.coverage) return b.coverage - a.coverage
        break
      }
      case 'coverage': {
        if (b.coverage !== a.coverage) return b.coverage - a.coverage
        if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length
        break
      }
      case 'time': {
        if (a.dish.minutes !== b.dish.minutes) return a.dish.minutes - b.dish.minutes
        break
      }
      case 'difficulty': {
        const diff = difficultyRank(a.dish.difficulty) - difficultyRank(b.dish.difficulty)
        if (diff !== 0) return diff
        break
      }
    }
    return a.dish.name.localeCompare(b.dish.name, 'zh-Hans-CN')
  })
  return sorted
}
