import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { clearEverything, putIngredients, saveDish } from '@/lib/db'
import type { Dish } from '@/lib/types'
import { useKitchenStore } from '@/stores/useKitchenStore'

/** 渲染后等 hydrate 真的跑完，避免出现「测试结束时还在写 store」的 act 警告 */
async function renderAt(path: string) {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  await waitFor(() => {
    expect(useKitchenStore.getState().hydrated).toBe(true)
  })
  return utils
}

function dish(partial: Partial<Dish> & Pick<Dish, 'id' | 'name'>): Dish {
  return {
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

async function seedKitchen() {
  await saveDish(
    dish({
      id: 'd1',
      name: '番茄虾仁',
      ingredients: ['番茄', '虾'],
      steps: ['腌虾仁', '炒番茄'],
      createdAt: 2,
    }),
  )
  await saveDish(
    dish({
      id: 'd2',
      name: '拍黄瓜',
      ingredients: ['黄瓜'],
      minutes: 5,
      steps: ['拍黄瓜', '拌匀'],
      createdAt: 1,
    }),
  )
  await putIngredients([
    { id: 'i1', name: '番茄', addedAt: 1 },
    { id: 'i2', name: '虾', addedAt: 2 },
    { id: 'i3', name: '黄瓜', addedAt: 3 },
  ])
}

afterEach(async () => {
  // 先卸载再改 store，否则等于在测试结束后触发 React 更新
  cleanup()
  await clearEverything()
  useKitchenStore.setState({ dishes: [], ingredients: [], hydrated: false, tonightDishId: null })
})

describe('界面冒烟测试', () => {
  it('首页在没有数据时给出引导，而不是白屏', async () => {
    await renderAt('/')
    expect(await screen.findByText('今晚吃啥')).toBeInTheDocument()
    expect(await screen.findByText('还没有记录任何菜')).toBeInTheDocument()
  })

  it('菜品库空态可渲染', async () => {
    await renderAt('/dishes')
    expect(await screen.findByText('菜品库还是空的')).toBeInTheDocument()
  })

  it('没有食材时转盘页给出空态而不是崩掉', async () => {
    await renderAt('/spin')
    expect(await screen.findByText('没有可以抽的菜')).toBeInTheDocument()
  })

  it('AI 页在未配置 key 时提示演示模式', async () => {
    await renderAt('/ai')
    expect(await screen.findByText('演示模式 · 未配置 key')).toBeInTheDocument()
  })

  it('有数据时首页列出用现有食材能做的菜', async () => {
    await seedKitchen()
    await renderAt('/')
    expect(await screen.findByText('番茄虾仁')).toBeInTheDocument()
    expect(await screen.findByText('拍黄瓜')).toBeInTheDocument()
    expect(await screen.findByText('现有食材就能做')).toBeInTheDocument()
  })

  it('有数据时转盘页渲染出候选数量和转动按钮', async () => {
    await seedKitchen()
    await renderAt('/spin')
    expect(await screen.findByText('2 道候选')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /转一下/ })).toBeInTheDocument()
  })
})
