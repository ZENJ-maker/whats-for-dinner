import { normalizeList, normalizeName } from './name'
import type { Dish, DishWithMatch } from './types'

/** 家里现有食材 → 归一化集合 */
export function pantrySet(names: string[]): Set<string> {
  return new Set(normalizeList(names))
}

/**
 * 一道菜 vs 现有食材。
 *
 * coverage = 命中主料数 / 主料总数。100% 即「现在就能做」。
 * 调料不参与判定（盐、油、生抽这类默认家里有）。
 *
 * 注意：`pantry` 必须是已经归一化过的集合（用 {@link pantrySet} 构造），
 * 否则「西红柿」对不上「番茄」。批量匹配请直接用 {@link matchAll}。
 */
export function matchDish(dish: Dish, pantry: ReadonlySet<string>): DishWithMatch {
  const required = normalizeList(dish.ingredients)
  const matched: string[] = []
  const missing: string[] = []

  for (const item of required) {
    if (pantry.has(item)) matched.push(item)
    else missing.push(item)
  }

  const coverage = required.length === 0 ? 1 : matched.length / required.length
  return {
    dish,
    coverage,
    matched,
    missing,
    canCook: missing.length === 0,
  }
}

export function matchAll(dishes: Dish[], pantryNames: string[]): DishWithMatch[] {
  const pantry = pantrySet(pantryNames)
  return dishes.map((dish) => matchDish(dish, pantry))
}

/** 0.8 → "80%"（不显示小数） */
export function formatCoverage(coverage: number): string {
  return `${Math.round(coverage * 100)}%`
}

/** 缺料的人类可读文案 */
export function missingText(m: DishWithMatch): string {
  if (m.canCook) return '食材齐了'
  if (m.missing.length === 1) return `还差 1 样：${m.missing[0]}`
  return `缺 ${m.missing.join('、')}`
}

export { normalizeName }
