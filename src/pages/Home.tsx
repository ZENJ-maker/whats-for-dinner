import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DishCard } from '@/components/DishCard'
import { EmptyState } from '@/components/EmptyState'
import { matchAll } from '@/lib/match'
import { sortMatches } from '@/lib/sort'
import { SORT_LABELS, type SortMode } from '@/lib/types'
import { useKitchenStore } from '@/stores/useKitchenStore'

export function Home() {
  const dishes = useKitchenStore((s) => s.dishes)
  const ingredients = useKitchenStore((s) => s.ingredients)
  const tonightDishId = useKitchenStore((s) => s.tonightDishId)
  const setTonight = useKitchenStore((s) => s.setTonight)
  const navigate = useNavigate()

  const [mode, setMode] = useState<SortMode>('pantry')
  const [onlyCanCook, setOnlyCanCook] = useState(true)

  const matches = useMemo(
    () => sortMatches(matchAll(dishes, ingredients.map((item) => item.name)), mode),
    [dishes, ingredients, mode],
  )
  const visible = onlyCanCook ? matches.filter((item) => item.canCook) : matches
  const tonightDish = dishes.find((dish) => dish.id === tonightDishId)
  const canSpin = visible.length >= 2

  return (
    <div className="pb-28">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">今晚吃啥</h1>
            <p className="mt-0.5 text-xs text-muted">
              {dishes.length} 道菜 · {ingredients.length} 种食材在手
            </p>
          </div>
          <Link
            to="/settings"
            aria-label="设置"
            className="rounded-full border border-line bg-white px-2.5 py-2 text-sm text-ink-soft"
          >
            ⚙︎
          </Link>
        </div>

        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
          {ingredients.length === 0 ? (
            <Link to="/pantry" className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-muted">
              + 先录几样家里有的食材
            </Link>
          ) : (
            ingredients.map((item) => (
              <span
                key={item.id}
                className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs text-ink-soft shadow-[0_1px_2px_rgba(43,33,24,0.04)]"
              >
                {item.name}
              </span>
            ))
          )}
          <Link to="/pantry" className="shrink-0 px-1 text-xs text-brand">
            编辑
          </Link>
        </div>

        {tonightDish ? (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft/70 px-3 py-2">
            <span className="text-xs text-brand-dark">
              今晚吃：<b className="text-sm">{tonightDish.name}</b>
            </span>
            <button type="button" className="text-[11px] text-brand-dark/70" onClick={() => setTonight(null)}>
              换一个
            </button>
          </div>
        ) : null}
      </header>

      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex gap-1 rounded-full bg-cream-deep p-0.5">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                mode === key ? 'bg-brand text-white' : 'text-ink-soft'
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">
          {onlyCanCook ? '现有食材就能做' : '全部菜品'}
          <span className="ml-1.5 text-xs font-normal text-muted">{visible.length} 道</span>
        </h2>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={onlyCanCook}
            onChange={(event) => setOnlyCanCook(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#e4572e]"
          />
          只看能做的
        </label>
      </div>

      <div className="mt-2 space-y-2.5 px-4">
        {dishes.length === 0 ? (
          <EmptyState
            emoji="🍳"
            title="还没有记录任何菜"
            description="先把你平时会做的菜录进来，写上主料，之后只要录了家里有的食材，就能自动挑出今天能做的。"
            action={
              <div className="flex gap-2">
                <Link to="/dishes" className="rounded-full bg-brand px-4 py-2 text-sm text-white">
                  去录菜
                </Link>
                <Link to="/ai" className="rounded-full border border-line bg-white px-4 py-2 text-sm">
                  让 AI 生成
                </Link>
              </div>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            emoji="🧺"
            title={onlyCanCook ? '现有食材还凑不出一道菜' : '这里还是空的'}
            description={
              onlyCanCook
                ? '补几样食材，或者关掉「只看能做的」看看全部菜品里差些什么。'
                : '换个排序方式看看。'
            }
            action={
              <Link to="/pantry" className="rounded-full bg-brand px-4 py-2 text-sm text-white">
                去补食材
              </Link>
            }
          />
        ) : (
          visible.map((item) => (
            <DishCard
              key={item.dish.id}
              match={item}
              isTonight={item.dish.id === tonightDishId}
              onCook={setTonight}
            />
          ))
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4 pb-3">
        <button
          type="button"
          disabled={!canSpin}
          onClick={() =>
            navigate(`/spin?mode=${mode}&only=${onlyCanCook ? '1' : '0'}`)
          }
          className={`pointer-events-auto w-full rounded-2xl py-3.5 text-center text-[15px] font-semibold shadow-lg transition-transform active:scale-[0.99] ${
            canSpin ? 'bg-brand text-white shadow-brand/25' : 'bg-line text-muted'
          }`}
        >
          🎲 抽一道
          {canSpin ? <span className="ml-1.5 text-xs font-normal opacity-80">选择困难时用</span> : null}
        </button>
      </div>
    </div>
  )
}
