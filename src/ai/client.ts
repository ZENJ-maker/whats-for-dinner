import { readCache, writeCache } from '@/lib/db'
import type { AiConfig, AiDish } from '@/lib/types'
import { CACHE_TTL_MS, buildCacheKey } from './cache'
import { mockDishes } from './mock'
import { PROMPT_VERSION, buildPrompt } from './prompt'
import { extractJson, parseAiBatch } from './schema'

export type AiErrorKind =
  | 'auth'
  | 'forbidden'
  | 'endpoint'
  | 'request'
  | 'rate'
  | 'network'
  | 'timeout'
  | 'format'
  | 'server'
  | 'abort'

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
    const raw = await response.text()

    if (!response.ok) {
      throw describeHttpError(response.status, raw)
    }

    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] }
    } catch {
      throw new AiError('format', '模型返回的不是 JSON')
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

/** 从服务端返回的错误体里抠出一句人话，抠不出来就截断原始文本 */
export function extractServerMessage(body: string): string {
  try {
    const data = JSON.parse(body) as {
      error?: { message?: string } | string
      message?: string
      detail?: string
    }
    const raw =
      (typeof data.error === 'string' ? data.error : data.error?.message) ??
      data.message ??
      data.detail
    if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 160)
  } catch {
    /* 不是 JSON，走下面的截断 */
  }
  return body.trim().slice(0, 160)
}

/**
 * HTTP 状态码 → 能直接照做的一句话。
 *
 * 之前 401 和 403 都被压成「key 无效或没有权限」，用户根本看不出
 * 是 key 错了、模型名错了，还是 Base URL 多了少了 /v1。
 */
export function describeHttpError(status: number, body: string): AiError {
  const detail = extractServerMessage(body)
  const tail = detail ? `（服务端说：${detail}）` : ''

  if (status === 401) {
    return new AiError('auth', `API key 无效或已过期（401）${tail}`)
  }
  if (status === 403) {
    return new AiError('forbidden', `这个 key 没有访问权限（403）${tail}`)
  }
  if (status === 404) {
    return new AiError(
      'endpoint',
      `接口地址不对（404），检查 Base URL 是不是少了 /v1${tail}`,
    )
  }
  if (status === 400 || status === 422) {
    return new AiError(
      'request',
      `请求被拒绝（${status}）${tail || '，常见原因是模型名写错了'}`,
    )
  }
  if (status === 429) {
    return new AiError('rate', `请求太频繁或额度用完了（429）${tail}`)
  }
  if (status >= 500) {
    return new AiError('server', `模型服务出错（${status}）${tail}`)
  }
  return new AiError('server', `请求失败（${status}）${tail}`)
}

export interface ConnectionResult {
  ok: boolean
  message: string
  status?: number
}

const TEST_TIMEOUT_MS = 15_000

/**
 * 设置页的「测试连接」：只发一个最小请求，
 * 用来把「key 错 / 模型名错 / 地址错」这三种情况当场分开。
 */
export async function testConnection(config: AiConfig): Promise<ConnectionResult> {
  if (!config.apiKey.trim()) {
    return { ok: false, message: '还没填 API key' }
  }

  const { signal, cleanup } = withTimeout(undefined, TEST_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 4,
      }),
      signal,
    })

    const raw = await response.text()
    if (!response.ok) {
      return { ok: false, status: response.status, message: describeHttpError(response.status, raw).message }
    }
    return { ok: true, message: `连接成功，模型 ${config.model} 可以正常调用` }
  } catch (error) {
    if (isAbort(error)) {
      return { ok: false, message: '连接超时（15 秒），检查网络或 Base URL' }
    }
    return {
      ok: false,
      message: '连不上这个地址：可能是网络问题，也可能是对方不允许浏览器直接调用（CORS）',
    }
  } finally {
    cleanup()
  }
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
