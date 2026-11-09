/** 全部持久化类型定义 */

export type Difficulty = '简单' | '普通' | '较难'
export type Source = 'self' | 'ai'

export const DIFFICULTIES: Difficulty[] = ['简单', '普通', '较难']

export interface PhotoRecord {
  id: string
  /** 最长边 1280 的展示图 */
  full: Blob
  /** 320×320 的缩略图 */
  thumb: Blob
  w: number
  h: number
  createdAt: number
}

export interface Dish {
  id: string
  name: string
  photoId?: string
  /** 归一化后的食材名，用于匹配 */
  ingredients: string[]
  /** 调料不参与缺料判定 */
  seasonings: string[]
  minutes: number
  difficulty: Difficulty
  steps: string[]
  /** 口味路线：家常 / 酸甜 / 香辣… 供 AI「换路子」参考 */
  flavor?: string
  tags: string[]
  source: Source
  createdAt: number
}

export interface Ingredient {
  id: string
  name: string
  amount?: string
  addedAt: number
}

export interface AiConfig {
  baseUrl: string
  model: string
  apiKey: string
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: '',
}

/** AI 生成的一道菜（尚未入库） */
export interface AiDish {
  name: string
  minutes: number
  difficulty: Difficulty
  ingredients: string[]
  seasonings: string[]
  steps: string[]
  flavor: string
  tags: string[]
}

export type SortMode = 'pantry' | 'coverage' | 'time' | 'difficulty'

export const SORT_LABELS: Record<SortMode, string> = {
  pantry: '优先消耗',
  coverage: '匹配度',
  time: '时间',
  difficulty: '难度',
}

export interface DishWithMatch {
  dish: Dish
  /** 0–1 */
  coverage: number
  matched: string[]
  missing: string[]
  canCook: boolean
}
