import { readCache, writeCache } from '@/lib/db'
import type { AiConfig, AiDish } from '@/lib/types'
import { CACHE_TTL_MS, buildCacheKey } from './cache'
import { mockDishes } from './mock'
import { PROMPT_VERSION, buildPrompt } from './prompt'
import { extractJson, parseAiBatch } from './schema'

export type AiErrorKind = 'auth' | 'rate' | 'network' | 'timeout' | 'format' | 'server' | 'abort'

export class AiError extends Error {
  kind: AiErrorKind

  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
  }
}

export interface GenerateArgs {
  config: AiConfig
  pantry: string[]
  existingNames: string[]
  flavors?: string[]
  count?: number
  mode?: 'batch' | 'explore' | 'table'
  signal?: AbortSignal
}

export interface GenerateResult {
  dishes: AiDish[]
  cached: boolean
  mock: boolean
}

const TIMEOUT_MS = 60_000

export async function generateDishes(args: GenerateArgs): Promise<GenerateResult> {
  const { config, pantry, existingNames, count = 12, mode = 'batch', signal } = args
  const flavors = args.flavors ?? []

  // 没配 key：走演示数据，UI 会打上「演示数据」角标
  if (!config.apiKey.trim()) {
    await sleep(400)
    return { dishes: mockDishes(pantry, existingNames, count), cached: false, mock: true }
  }

  const cacheKey = await buildCacheKey({
    pantry,
    existingNames,
    model: config.model,
    count,
    mode,
    promptVersion: PROMPT_VERSION,
  })

  const cached = await readCache<AiDish[]>(cacheKey, CACHE_TTL_MS)
  if (cached) return { dishes: cached, cached: true, mock: false }

  const prompt = buildPrompt({ pantry, existingNames, flavors, count, mode })
  const dishes = await requestWithRetry(config, prompt, signal)
  await writeCache(cacheKey, dishes)
  return { dishes, cached: false, mock: false }
}

async function requestWithRetry(
  config: AiConfig,
  prompt: { system: string; user: string },
  signal: AbortSignal | undefined,
): Promise<AiDish[]> {
  try {
    return await requestOnce(config, prompt, signal)
  } catch (error) {
    // 只有「格式不对」值得重试一次，网络和鉴权错误重试也是白费
    if (error instanceof AiError && error.kind === 'format') {
      const stricter = {
        ...prompt,
        user: `${prompt.user}\n\n上一次的输出不是合法 JSON。请只输出一个 JSON 对象，不要任何解释文字、不要 markdown 代码块。`,
      }
      return requestOnce(config, stricter, signal)
    }
    throw error
  }
}

async function requestOnce(
  config: AiConfig,
  prompt: { system: string; user: string },
  signal: AbortSignal | undefined,
): Promise<AiDish[]> {
  const { signal: combined, cleanup } = withTimeout(signal, TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(endpoint(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      }),
      signal: combined,
    })
  } catch (error) {
    cleanup()
    if (isAbort(error)) {
      if (signal?.aborted) throw new AiError('abort', '已取消')
      throw new AiError('timeout', 'AI 响应超时了，稍后再试')
    }
    throw new AiError('network', '网络不通，检查一下连接')
  }

  try {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AiError('auth', 'API key 无效或没有权限')
      }
      if (response.status === 429) {
        throw new AiError('rate', '请求太频繁了，等几秒再试')
      }
      throw new AiError('server', `模型服务返回 ${response.status}`)
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new AiError('format', '模型返回了空内容')

    try {
      const parsed = parseAiBatch(extractJson(content))
      return parsed.dishes
    } catch {
      throw new AiError('format', '模型返回的格式不对')
    }
  } finally {
    cleanup()
  }
}

function endpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}/chat/completions`
}

function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** UI 上直接展示的文案 */
export function aiErrorText(error: unknown): string {
  if (error instanceof AiError) return error.message
  if (error instanceof Error) return error.message
  return '出了点问题，重试一下'
}
