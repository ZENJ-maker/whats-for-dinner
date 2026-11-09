import { describe, expect, it } from 'vitest'
import { matchAll, matchDish, missingText, pantrySet } from '@/lib/match'
import { normalizeList, normalizeName } from '@/lib/name'
import type { Dish } from '@/lib/types'

function makeDish(partial: Partial<Dish> & Pick<Dish, 'name'>): Dish {
  return {
    id: partial.name,
    ingredients: [],
    seasonings: [],
    minutes: 15,
    difficulty: '简单',
    steps: [],
    tags: [],
    source: 'self',
    createdAt: 0,
    ...partial,
  }
}

describe('normalizeName', () => {
  it('把常见别名收敛到同一个词', () => {
    expect(normalizeName('西红柿')).toBe('番茄')
    expect(normalizeName('马铃薯')).toBe('土豆')
    expect(normalizeName('嫩豆腐')).toBe('豆腐')
    expect(normalizeName('虾仁')).toBe('虾')
  })

  it('去掉「新鲜」这类形容词前缀', () => {
    expect(normalizeName('新鲜番茄')).toBe('番茄')
    expect(normalizeName('冷冻虾仁')).toBe('虾')
  })

  it('去掉括号补充说明和空白', () => {
    expect(normalizeName('番茄（中等大小）')).toBe('番茄')
    expect(normalizeName(' 土 豆 ')).toBe('土豆')
  })

  it('空字符串安全返回', () => {
    expect(normalizeName('   ')).toBe('')
  })
})

describe('normalizeList', () => {
  it('支持顿号、逗号、换行混排并去重', () => {
    expect(normalizeList('番茄、虾仁, 嫩豆腐\n番茄')).toEqual(['番茄', '虾', '豆腐'])
  })
})

describe('matchDish', () => {
  const dish = makeDish({ name: '番茄虾仁', ingredients: ['番茄', '虾仁'] })

  it('食材齐全时 100% 匹配', () => {
    const result = matchDish(dish, new Set(['番茄', '虾']))
    expect(result.canCook).toBe(true)
    expect(result.coverage).toBe(1)
    expect(result.missing).toEqual([])
  })

  it('缺一样时给出缺料和比例', () => {
    const result = matchDish(dish, new Set(['番茄']))
    expect(result.canCook).toBe(false)
    expect(result.coverage).toBe(0.5)
    expect(result.missing).toEqual(['虾'])
    expect(missingText(result)).toContain('还差 1 样')
  })

  it('没写主料的菜视为随时能做', () => {
    const result = matchDish(makeDish({ name: '白米饭' }), new Set())
    expect(result.coverage).toBe(1)
    expect(result.canCook).toBe(true)
  })

  it('别名不影响匹配', () => {
    const result = matchDish(dish, pantrySet(['西红柿', '虾仁']))
    expect(result.canCook).toBe(true)
  })
})

describe('matchAll', () => {
  it('批量匹配保持顺序', () => {
    const dishes = [
      makeDish({ name: 'A', ingredients: ['土豆'] }),
      makeDish({ name: 'B', ingredients: ['番茄'] }),
    ]
    const results = matchAll(dishes, ['番茄'])
    expect(results.map((item) => item.dish.name)).toEqual(['A', 'B'])
    expect(results[0].canCook).toBe(false)
    expect(results[1].canCook).toBe(true)
  })
})
