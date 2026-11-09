import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { useKitchenStore } from '@/stores/useKitchenStore'

const SUGGESTIONS = ['番茄', '鸡蛋', '土豆', '黄瓜', '豆腐', '虾', '五花肉', '青椒', '香菇', '米']

export function Pantry() {
  const ingredients = useKitchenStore((s) => s.ingredients)
  const addIngredient = useKitchenStore((s) => s.addIngredient)
  const removeIngredient = useKitchenStore((s) => s.removeIngredient)
  const clearPantry = useKitchenStore((s) => s.clearPantry)
  const [input, setInput] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!input.trim()) return
    void addIngredient(input)
    setInput('')
  }

  const addQuick = (name: string) => {
    void addIngredient(name)
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">食材库</h1>
        <p className="text-xs text-muted">记下家里现在有的东西，首页会按这个算能做什么菜</p>
      </header>

      <form onSubmit={submit} className="flex gap-2 px-4 pt-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="番茄、虾仁、嫩豆腐…（可一次填多个）"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none placeholder:text-muted/70 focus:border-brand/60"
        />
        <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white">
          加入
        </button>
      </form>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {SUGGESTIONS.filter((name) => !ingredients.some((item) => item.name === name)).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => addQuick(name)}
            className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft"
          >
            + {name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold">
          家里有的 <span className="text-xs font-normal text-muted">{ingredients.length} 种</span>
        </h2>
        {ingredients.length ? (
          <button type="button" onClick={() => void clearPantry()} className="text-xs text-muted">
            全部清空
          </button>
        ) : null}
      </div>

      {ingredients.length === 0 ? (
        <EmptyState
          title="冰箱还是空的"
          description="把现在有的食材录进来，哪怕只有三样，也能看出今天能做什么。"
        />
      ) : (
        <ul className="mt-2 divide-y divide-line/70 px-4">
          {ingredients.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => void removeIngredient(item.id)}
                className="rounded-full px-2 py-1 text-xs text-muted"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
