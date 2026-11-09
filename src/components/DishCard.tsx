import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { formatCoverage, missingText } from '@/lib/match'
import type { DishWithMatch } from '@/lib/types'

interface DishCardProps {
  match: DishWithMatch
  onCook?: (dishId: string) => void
  isTonight?: boolean
}

export function DishCard({ match, onCook, isTonight }: DishCardProps) {
  const { dish, coverage, matched, canCook } = match
  const url = usePhotoUrl(dish.photoId)

  return (
    <article className="flex gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(43,33,24,0.05)]">
      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-cream-deep">
        {url ? (
          <img src={url} alt={dish.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">🍲</span>
        )}
        {dish.source === 'ai' ? (
          <span className="absolute left-1 top-1 rounded-full bg-ink/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
            AI
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold leading-tight">{dish.name}</h3>
          <span
            className={`shrink-0 text-right text-sm font-bold leading-tight ${
              canCook ? 'text-brand' : 'text-muted'
            }`}
          >
            {formatCoverage(coverage)}
            <span className="block text-[9px] font-normal text-muted">匹配</span>
          </span>
        </div>

        <p className="mt-1 text-[11px] text-muted">
          {dish.minutes} 分钟 · {dish.difficulty}
          {isTonight ? ' · 今晚就吃它' : ''}
        </p>

        {canCook ? (
          <p className="mt-1 truncate text-[11px] text-leaf">能用上: {matched.join('、') || '基础调料'}</p>
        ) : (
          <p className="mt-1 truncate text-[11px] text-muted">{missingText(match)}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCook?.(dish.id)}
            disabled={!onCook}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              isTonight
                ? 'bg-brand text-white'
                : canCook
                  ? 'bg-brand-soft text-brand-dark'
                  : 'bg-cream-deep text-muted'
            }`}
          >
            {isTonight ? '今晚吃这个' : '加入今晚'}
          </button>
          {dish.steps.length ? (
            <span className="text-[10px] text-muted">{dish.steps.length} 步做法</span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
