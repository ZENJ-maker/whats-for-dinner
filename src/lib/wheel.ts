/**
 * 转盘角度数学。
 *
 * 约定：指针固定在 12 点方向（0°），圆盘顺时针旋转 rotation 度。
 * 第 i 个扇区在圆盘自身的坐标系里占据 [i*step, (i+1)*step)，
 * 旋转之后它出现在屏幕上的是 [i*step + rotation, ...)。
 * 指针命中条件： (0 - rotation) mod 360 ∈ [i*step, (i+1)*step)
 */

export const DEFAULT_TURNS = 5

export function sectorAngle(n: number): number {
  return 360 / n
}

/** 当前旋转角下，指针指着的扇区下标 */
export function winnerIndex(rotation: number, n: number): number {
  if (n <= 0) return 0
  const step = sectorAngle(n)
  const normalized = (((-rotation) % 360) + 360) % 360
  const index = Math.floor(normalized / step)
  return Math.min(index, n - 1)
}

/**
 * 为了让 index 中奖，圆盘需要停到的绝对角度。
 *
 * @param current 当前旋转角（可以已经转过很多圈）
 * @param jitter  在扇区内的随机偏移比例（-0.5~0.5），避免每次都停在正中间
 */
export function rotationForIndex(
  index: number,
  n: number,
  current: number,
  turns: number = DEFAULT_TURNS,
  jitter = 0,
): number {
  const step = sectorAngle(n)
  const center = (index + 0.5) * step
  // 希望 ((-R) mod 360) 落在扇区中心附近
  const desired = (360 - center - jitter * step) % 360
  const currentNorm = ((current % 360) + 360) % 360
  const delta = (desired - currentNorm + 360) % 360
  return current + turns * 360 + delta
}

/** 等概率抽一个下标，用 crypto 而不是 Math.random */
export function pickRandomIndex(n: number, random: () => number = secureRandom): number {
  if (n <= 0) return 0
  return Math.min(n - 1, Math.floor(random() * n))
}

function secureRandom(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] / 0x1_0000_0000
  }
  return Math.random()
}

/** 转盘最多显示多少道菜，再多就挤不下了，超出的回列表里看 */
export const MAX_WHEEL_SLICES = 12
