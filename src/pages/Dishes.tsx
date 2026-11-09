import { useState } from 'react'
import { DishForm } from '@/components/DishForm'
import { EmptyState } from '@/components/EmptyState'
import { Sheet } from '@/components/Sheet'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import type { Dish } from '@/lib/types'
import { useKitchenStore, type DishInput } from '@/stores/useKitchenStore'

export function Dishes() {
  const dishes = useKitchenStore((s) => s.dishes)
  const addDish = useKitchenStore((s) => s.addDish)
  const updateDish = useKitchenStore((s) => s.updateDish)
  const removeDish = useKitchenStore((s) => s.removeDish)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dish | undefined>(undefined)
  const [detail, setDetail] = useState<Dish | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const openEdit = (dish: Dish) => {
    setEditing(dish)
    setFormOpen(true)
  }

  const handleSubmit = async (input: DishInput) => {
    setSaving(true)
    try {
      if (editing) await updateDish(editing.id, input)
      else await addDish(input)
      setFormOpen(false)
      setEditing(undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-cream/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">菜品库</h1>
          <p className="text-xs text-muted">一共 {dishes.length} 道，自己做过的和 AI 生成的都在这里</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-brand px-3.5 py-2 text-sm font-medium text-white"
        >
          + 加一道
        </button>
      </header>

      {dishes.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="菜品库还是空的"
          description="把你拿手的菜记下来。照片放在上面，菜名在下面，主料写清楚，匹配功能才有依据。"
          action={
            <button type="button" onClick={openCreate} className="rounded-full bg-brand px-4 py-2 text-sm text-white">
              录第一道菜
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {dishes.map((dish) => (
            <button
              key={dish.id}
              type="button"
              onClick={() => setDetail(dish)}
              className="overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_2px_rgba(43,33,24,0.05)]"
            >
              <DishCover dish={dish} />
              <div className="px-2.5 py-2">
                <p className="truncate text-[13px] font-medium">{dish.name}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {dish.minutes} 分钟 · {dish.difficulty}
                  {dish.source === 'ai' ? ' · AI' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={formOpen}
        title={editing ? '编辑菜品' : '新增菜品'}
        onClose={() => setFormOpen(false)}
        footer={
          <button
            type="submit"
            form="dish-form"
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        }
      >
        <DishForm initial={editing} submitting={saving} onSubmit={handleSubmit} />
      </Sheet>

      <Sheet
        open={Boolean(detail)}
        title={detail?.name ?? ''}
        onClose={() => setDetail(undefined)}
        footer={
          detail ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await removeDish(detail.id)
                  setDetail(undefined)
                }}
                className="rounded-xl border border-line px-4 py-3 text-sm text-muted"
              >
                删除
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetail(undefined)
                  openEdit(detail)
                }}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white"
              >
                编辑
              </button>
            </div>
          ) : null
        }
      >
        {detail ? <DishDetail dish={detail} /> : null}
      </Sheet>
    </div>
  )
}

function DishCover({ dish }: { dish: Dish }) {
  const url = usePhotoUrl(dish.photoId)
  return (
    <div className="relative aspect-[4/3] w-full bg-cream-deep">
      {url ? (
        <img src={url} alt={dish.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-3xl">🍲</span>
      )}
      {dish.source === 'ai' ? (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/70 px-1.5 py-0.5 text-[9px] text-white">
          AI
        </span>
      ) : null}
    </div>
  )
}

function DishDetail({ dish }: { dish: Dish }) {
  const url = usePhotoUrl(dish.photoId)
  return (
    <div className="space-y-4">
      {url ? (
        <img src={url} alt={dish.name} className="h-44 w-full rounded-2xl object-cover" />
      ) : null}

      <p className="text-xs text-muted">
        {dish.minutes} 分钟 · {dish.difficulty}
        {dish.flavor ? ` · ${dish.flavor}` : ''}
      </p>

      <section>
        <h3 className="text-xs font-semibold text-ink-soft">主料</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {dish.ingredients.length ? (
            dish.ingredients.map((item) => (
              <span key={item} className="rounded-full bg-cream-deep px-2.5 py-1 text-[11px]">
                {item}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">没写主料，这道菜不会被食材匹配到</span>
          )}
        </div>
      </section>

      {dish.seasonings.length ? (
        <section>
          <h3 className="text-xs font-semibold text-ink-soft">调料</h3>
          <p className="mt-1 text-[13px] text-ink-soft">{dish.seasonings.join('、')}</p>
        </section>
      ) : null}

      {dish.steps.length ? (
        <section>
          <h3 className="text-xs font-semibold text-ink-soft">做法</h3>
          <ol className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-ink-soft">
            {dish.steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-brand">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
