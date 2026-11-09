/** 同样的食材 + 同样的模型，不该重复烧 token */

export async function hashKey(parts: (string | number)[]): Promise<string> {
  const text = parts.join('|')
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(text)
      const digest = await crypto.subtle.digest('SHA-256', data)
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      /* 非安全上下文（比如 http 局域网）没有 subtle，退回普通哈希 */
    }
  }
  return fallbackHash(text)
}

function fallbackHash(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0xc2b2ae35
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 16777619) >>> 0
    h2 = Math.imul(h2 ^ code, 2246822519) >>> 0
  }
  return `${h1.toString(16)}${h2.toString(16)}`
}

export function buildCacheKey(input: {
  pantry: string[]
  existingNames: string[]
  model: string
  count: number
  mode: string
  promptVersion: string
}): Promise<string> {
  return hashKey([
    [...input.pantry].sort().join(','),
    [...input.existingNames].sort().join(','),
    input.model,
    input.count,
    input.mode,
    input.promptVersion,
  ])
}

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
