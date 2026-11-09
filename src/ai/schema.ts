import { z } from 'zod'

/**
 * AI 输出必须是结构化数据。
 *
 * 这不是洁癖：只有结构化的结果才能渲染成卡片、判断缺哪些食材、一键写进菜品库。
 * 模型偶尔会多编字段或者少给字段，这里统一兜住。
 */
export const AiDishSchema = z.object({
  name: z.string().trim().min(2).max(20),
  minutes: z.number().int().min(5).max(180),
  difficulty: z.enum(['简单', '普通', '较难']),
  ingredients: z.array(z.string().trim().min(1)).min(1).max(12),
  seasonings: z.array(z.string().trim().min(1)).max(10).default([]),
  steps: z.array(z.string().trim().min(1)).min(2).max(10),
  flavor: z.string().trim().max(10).default('家常'),
  tags: z.array(z.string().trim().min(1)).max(4).default([]),
})

export const AiBatchSchema = z.object({
  dishes: z.array(AiDishSchema).min(1).max(20),
})

export type AiBatch = z.infer<typeof AiBatchSchema>

/** 解析失败会抛 ZodError，调用方负责重试或展示原始文本 */
export function parseAiBatch(raw: unknown): AiBatch {
  return AiBatchSchema.parse(raw)
}

/** 从可能夹着 markdown 代码块或解释文字的回复里抠出 JSON */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('模型没有返回 JSON')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}
