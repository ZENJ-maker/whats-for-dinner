import { describe, expect, it } from 'vitest'
import { extractJson, parseAiBatch } from '@/ai/schema'
import { collectFlavors } from '@/ai/prompt'
import { buildCacheKey } from '@/ai/cache'
import { mockDishes } from '@/ai/mock'
import { AiError, describeHttpError, extractServerMessage } from '@/ai/client'

const validDish = {
  name: '番茄虾仁',
  minutes: 15,
  difficulty: '简单',
  ingredients: ['番茄', '虾'],
  steps: ['腌虾仁', '炒番茄', '下虾仁'],
}

describe('parseAiBatch', () => {
  it('接受合法结构并补上默认值', () => {
    const parsed = parseAiBatch({ dishes: [validDish] })
    expect(parsed.dishes[0].seasonings).toEqual([])
    expect(parsed.dishes[0].tags).toEqual([])
    expect(parsed.dishes[0].flavor).toBe('家常')
  })

  it('缺少菜名时拒绝', () => {
    expect(() => parseAiBatch({ dishes: [{ ...validDish, name: '' }] })).toThrow()
  })

  it('难度不在枚举里时拒绝', () => {
    expect(() => parseAiBatch({ dishes: [{ ...validDish, difficulty: '还行' }] })).toThrow()
  })

  it('步骤少于两条时拒绝', () => {
    expect(() => parseAiBatch({ dishes: [{ ...validDish, steps: ['只有一步'] }] })).toThrow()
  })

  it('空列表时拒绝', () => {
    expect(() => parseAiBatch({ dishes: [] })).toThrow()
  })
})

describe('extractJson', () => {
  it('能从 markdown 代码块里抠出 JSON', () => {
    const text = '好的，这是结果：\n```json\n{"dishes":[]}\n```\n希望有用'
    expect(extractJson(text)).toEqual({ dishes: [] })
  })

  it('能从夹着解释文字的回答里抠出 JSON', () => {
    const text = '下面是菜谱 {"dishes":[]} 请查收'
    expect(extractJson(text)).toEqual({ dishes: [] })
  })

  it('完全没有 JSON 时报错', () => {
    expect(() => extractJson('抱歉，我做不到')).toThrow()
  })
})

describe('collectFlavors', () => {
  it('按出现次数降序聚合口味，并列时保持出现顺序', () => {
    expect(collectFlavors(['家常', '酸甜', '家常', undefined, '香辣'])).toEqual([
      '家常',
      '酸甜',
      '香辣',
    ])
  })
})

describe('buildCacheKey', () => {
  it('同样的输入得到同样的 key', async () => {
    const base = {
      pantry: ['番茄', '虾'],
      existingNames: ['番茄炒蛋'],
      model: 'deepseek-chat',
      count: 12,
      mode: 'batch',
      promptVersion: 'v1',
    }
    expect(await buildCacheKey(base)).toBe(await buildCacheKey({ ...base }))
  })

  it('食材顺序不影响 key', async () => {
    const base = {
      pantry: ['番茄', '虾'],
      existingNames: [],
      model: 'm',
      count: 12,
      mode: 'batch',
      promptVersion: 'v1',
    }
    expect(await buildCacheKey(base)).toBe(
      await buildCacheKey({ ...base, pantry: ['虾', '番茄'] }),
    )
  })

  it('模型或模式变了 key 就变', async () => {
    const base = {
      pantry: ['番茄'],
      existingNames: [],
      model: 'm',
      count: 12,
      mode: 'batch',
      promptVersion: 'v1',
    }
    const a = await buildCacheKey(base)
    expect(await buildCacheKey({ ...base, model: 'other' })).not.toBe(a)
    expect(await buildCacheKey({ ...base, mode: 'explore' })).not.toBe(a)
  })
})

describe('describeHttpError', () => {
  const body = (message: string) => JSON.stringify({ error: { message } })

  it('401 提示 key 无效，并带上服务端原话', () => {
    const error = describeHttpError(401, body('Authentication Fails'))
    expect(error).toBeInstanceOf(AiError)
    expect(error.kind).toBe('auth')
    expect(error.message).toContain('401')
    expect(error.message).toContain('Authentication Fails')
  })

  it('403 归为权限问题', () => {
    expect(describeHttpError(403, body('Forbidden')).kind).toBe('forbidden')
  })

  it('400 归为请求错误，并保留「模型不存在」这类原话', () => {
    const error = describeHttpError(400, body('Model Not Exist'))
    expect(error.kind).toBe('request')
    expect(error.message).toContain('Model Not Exist')
  })

  it('404 直接指向 Base URL 少了 /v1', () => {
    const error = describeHttpError(404, '')
    expect(error.kind).toBe('endpoint')
    expect(error.message).toContain('/v1')
  })

  it('429 与 5xx 分开归因', () => {
    expect(describeHttpError(429, '').kind).toBe('rate')
    const server = describeHttpError(502, 'bad gateway')
    expect(server.kind).toBe('server')
    expect(server.message).toContain('bad gateway')
  })
})

describe('extractServerMessage', () => {
  it('从 OpenAI 风格的 error.message 里取', () => {
    expect(extractServerMessage(JSON.stringify({ error: { message: 'Incorrect API key' } }))).toBe(
      'Incorrect API key',
    )
  })

  it('error 直接是字符串时也能取', () => {
    expect(extractServerMessage(JSON.stringify({ error: 'quota exceeded' }))).toBe('quota exceeded')
  })

  it('不是 JSON 时截断原文', () => {
    expect(extractServerMessage('<html>502 Bad Gateway</html>')).toBe('<html>502 Bad Gateway</html>')
  })

  it('空 body 不崩', () => {
    expect(extractServerMessage('')).toBe('')
  })
})

describe('mockDishes', () => {
  it('按食材挑出能做的菜', () => {
    const dishes = mockDishes(['番茄', '虾'], [], 3)
    expect(dishes.length).toBeGreaterThan(0)
    expect(dishes[0].ingredients.some((item) => ['番茄', '虾'].includes(item))).toBe(true)
  })

  it('避开已有菜品', () => {
    const first = mockDishes([], [], 1)[0]
    const next = mockDishes([], [first.name], 1)
    expect(next[0].name).not.toBe(first.name)
  })

  it('食材为空时也有内容可展示', () => {
    expect(mockDishes([], [], 3).length).toBeGreaterThan(0)
  })
})
