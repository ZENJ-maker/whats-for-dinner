import { describe, expect, it } from 'vitest'
import { sortMatches } from '@/lib/sort'
import type { DishWithMatch } from '@/lib/types'

function entry(
  name: string,
  options: { coverage: number; matched: number; minutes: number; difficulty: '简单' | '普通' | '较难' },
): DishWithMatch {
  return {
    dish: {
      id: name,
      name,
      ingredients: [],
      seasonings: [],
      minutes: options.minutes,
      difficulty: options.difficulty,
      steps: [],
      tags: [],
      source: 'self',
      createdAt: 0,
    },
    coverage: options.coverage,
    matched: Array.from({ length: options.matched }, (_, index) => `食材${index}`),
    missing: [],
    canCook: options.coverage === 1,
  }
}

const items = [
  entry('甲', { coverage: 0.5, matched: 1, minutes: 30, difficulty: '较难' }),
  entry('乙', { coverage: 1, matched: 3, minutes: 10, difficulty: '简单' }),
  entry('丙', { coverage: 1, matched: 2, minutes: 20, difficulty: '普通' }),
]

describe('sortMatches', () => {
  it('优先消耗：用掉家里食材最多的排前面', () => {
    expect(sortMatches(items, 'pantry').map((item) => item.dish.name)).toEqual(['乙', '丙', '甲'])
  })

  it('匹配度：比例高的在前，同比例时缺得少的在前', () => {
    const list = [
      entry('A', { coverage: 0.5, matched: 1, minutes: 10, difficulty: '简单' }),
      entry('B', { coverage: 1, matched: 2, minutes: 10, difficulty: '简单' }),
      entry('C', { coverage: 0.5, matched: 1, minutes: 5, difficulty: '简单' }),
    ]
    expect(sortMatches(list, 'coverage')[0].dish.name).toBe('B')
  })

  it('时间：短的在前', () => {
    expect(sortMatches(items, 'time').map((item) => item.dish.minutes)).toEqual([10, 20, 30])
  })

  it('难度：简单的在前', () => {
    expect(sortMatches(items, 'difficulty').map((item) => item.dish.difficulty)).toEqual([
      '简单',
      '普通',
      '较难',
    ])
  })

  it('不修改传入的数组', () => {
    const original = [...items]
    sortMatches(items, 'time')
    expect(items).toEqual(original)
  })

  it('完全同分时按菜名稳定排序', () => {
    const same = [
      entry('乙', { coverage: 1, matched: 1, minutes: 10, difficulty: '简单' }),
      entry('甲', { coverage: 1, matched: 1, minutes: 10, difficulty: '简单' }),
    ]
    expect(sortMatches(same, 'coverage').map((item) => item.dish.name)).toEqual(['甲', '乙'])
  })
})
