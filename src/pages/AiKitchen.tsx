import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sanitizeKey } from '@/ai/client'
import type { AiDish } from '@/lib/types'
import { useAiStore, type AiMode } from '@/stores/useAiStore'
import { useKitchenStore } from '@/stores/useKitchenStore'

const MODES: { key: AiMode; title: string; desc: string }[] = [
  { key: 'batch', title: '按食材生成一批', desc: '把这些食材能做的菜尽量多列出来' },
  { key: 'explore', title: '换个新口味', desc: '避开你做惯的路子，给点新鲜的' },
  { key: 'table', title: '配一桌', desc: '荤素搭配，凑一桌今晚的菜' },
]

export function AiKitchen() {
  const config = useAiStore((s) => s.config)
  const results = useAiStore((s) => s.results)
  const loading = useAiStore((s) => s.loading)
  const error = useAiStore((s) => s.error)
  const isMock = useAiStore((s) => s.isMock)
  const isCached = useAiStore((s) => s.isCached)
  const generate = useAiStore((s) => s.generate)

  const ingredients = useKitchenStore((s) => s.ingredients)
  const importAiDishes = useKitchenStore((s) => s.importAiDishes)

  const [importedCount, setImportedCount] = useState(0)
  const hasKey = Boolean(sanitizeKey(config.apiKey))

  const importOne = async (dish: AiDish) => {
    const count = await importAiDishes([dish])
    setImportedCount((value) => value + count)
  }

  const importAll = async () => {
    const count = await importAiDishes(results)
    setImportedCount((value) => value + count)
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">AI 厨房</h1>
        <p className="text-xs text-muted">用你现在有的食材，生成你还没做过的菜</p>
      </header>

      <section className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">当前食材</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              hasKey ? 'bg-leaf/10 text-leaf' : 'bg-brand-soft text-brand-dark'
            }`}
          >
            {hasKey ? `已配置 ${config.model}` : '演示模式 · 未配置 key'}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          {ingredients.length ? ingredients.map((item) => item.name).join('、') : '还没录食材，AI 会自己挑常见的搭配'}
        </p>
        {!hasKey ? (
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            现在返回的是内置示例菜谱，随时能点。想用真模型，去{' '}
            <Link to="/settings" className="text-brand">
              设置
            </Link>{' '}
            里填 API key。
          </p>
        ) : null}
      </section>

      <div className="mt-3 grid gap-2 px-4">
        {MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            disabled={loading}
            onClick={() => void generate(mode.key)}
            className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-left disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-medium">{mode.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{mode.desc}</span>
            </span>
            <span className="text-brand">→</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-center text-sm text-muted">
          正在翻菜谱
          <span className="animate-pulse">…</span>
        </p>
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-brand-soft/70 px-4 py-3 text-xs text-brand-dark">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => void generate('batch')}>
            重试
          </button>
        </div>
      ) : null}

      {results.length ? (
        <section className="mt-5">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-sm font-semibold">
              生成了 {results.length} 道
              {isMock ? (
                <span className="ml-1.5 rounded bg-cream-deep px-1.5 py-0.5 text-[10px] font-normal text-muted">
                  演示数据
                </span>
              ) : null}
              {isCached ? (
                <span className="ml-1.5 rounded bg-cream-deep px-1.5 py-0.5 text-[10px] font-normal text-muted">
                  来自缓存
                </span>
              ) : null}
            </h2>
            <button type="button" onClick={() => void importAll()} className="text-xs text-brand">
              全部加入菜品库
            </button>
          </div>

          {importedCount ? (
            <p className="px-4 pt-1 text-[11px] text-leaf">已加入菜品库 {importedCount} 道</p>
          ) : null}

          <div className="mt-2 space-y-2.5 px-4">
            {results.map((dish, index) => (
              <article key={`${dish.name}-${index}`} className="rounded-2xl bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold">{dish.name}</h3>
                  <span className="shrink-0 text-[11px] text-muted">
                    {dish.minutes} 分钟 · {dish.difficulty}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {dish.ingredients.map((item) => (
                    <span key={item} className="rounded bg-cream-deep px-1.5 py-0.5 text-[10px] text-ink-soft">
                      {item}
                    </span>
                  ))}
                </div>

                <ol className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-soft">
                  {dish.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex gap-1.5">
                      <span className="text-brand">{stepIndex + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted">
                    {dish.flavor}
                    {dish.tags.length ? ` · ${dish.tags.join(' / ')}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void importOne(dish)}
                    className="rounded-full bg-brand-soft px-3 py-1 text-[11px] text-brand-dark"
                  >
                    加入菜品库
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!results.length && !loading ? (
        <p className="mt-8 px-10 text-center text-xs leading-relaxed text-muted">
          生成结果只会写进你的菜品库，不会自动替换已有内容。AI 给的菜谱建议先看一遍再照着做。
        </p>
      ) : null}
    </div>
  )
}
