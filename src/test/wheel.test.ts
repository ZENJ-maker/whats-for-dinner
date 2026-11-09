import { describe, expect, it } from 'vitest'
import {
  MAX_WHEEL_SLICES,
  pickRandomIndex,
  rotationForIndex,
  winnerIndex,
} from '@/lib/wheel'

describe('winnerIndex', () => {
  it('不旋转时指针在第一个扇区', () => {
    expect(winnerIndex(0, 4)).toBe(0)
  })

  it('转过一个扇区就落到下一个', () => {
    expect(winnerIndex(-90, 4)).toBe(1)
    expect(winnerIndex(-180, 4)).toBe(2)
    expect(winnerIndex(-270, 4)).toBe(3)
  })

  it('跨过整圈后依然正确', () => {
    expect(winnerIndex(-90 - 360 * 3, 4)).toBe(1)
    expect(winnerIndex(90 + 360, 4)).toBe(3)
  })

  it('落点刚好压在分隔线上时不越界', () => {
    expect(winnerIndex(-90, 5)).toBe(1)
    expect(winnerIndex(-72, 5)).toBe(1)
    expect(winnerIndex(-360, 5)).toBe(0)
  })

  it('下标永远在范围内', () => {
    for (const n of [1, 2, 3, 7, 12]) {
      for (const rotation of [-1000, -359.999, 0, 12.5, 359.9, 720.1]) {
        const index = winnerIndex(rotation, n)
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(n)
      }
    }
  })
})

describe('rotationForIndex', () => {
  it('算出来的角度确实会让指定下标中奖', () => {
    for (const n of [2, 3, 6, 12]) {
      for (let index = 0; index < n; index++) {
        const rotation = rotationForIndex(index, n, 0, 5, 0)
        expect(winnerIndex(rotation, n)).toBe(index)
      }
    }
  })

  it('从任意当前角度出发都能命中', () => {
    for (const current of [-720, -30, 0, 77, 540]) {
      const rotation = rotationForIndex(3, 8, current, 5, 0)
      expect(winnerIndex(rotation, 8)).toBe(3)
      expect(rotation).toBeGreaterThan(current)
    }
  })

  it('带抖动时仍然命中同一个下标', () => {
    for (const jitter of [-0.4, -0.1, 0, 0.25, 0.4]) {
      const rotation = rotationForIndex(2, 6, 0, 5, jitter)
      expect(winnerIndex(rotation, 6)).toBe(2)
    }
  })

  it('至少转满指定的圈数，动画才有观感', () => {
    const rotation = rotationForIndex(0, 4, 0, 5, 0)
    expect(rotation).toBeGreaterThanOrEqual(5 * 360)
  })
})

describe('pickRandomIndex', () => {
  it('结果落在合法范围内', () => {
    expect(pickRandomIndex(5, () => 0)).toBe(0)
    expect(pickRandomIndex(5, () => 0.999999)).toBe(4)
    expect(pickRandomIndex(1, () => 0.5)).toBe(0)
  })

  it('空集合不会返回负数', () => {
    expect(pickRandomIndex(0)).toBe(0)
  })

  it('盘上最多放 12 道', () => {
    expect(MAX_WHEEL_SLICES).toBe(12)
  })
})
